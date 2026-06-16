"""
VieTrans Auth Module
────────────────────
Authentication endpoints: Register, Login, Forgot/Reset Password, Profile.
Uses MongoDB (motor async driver), JWT tokens, and bcrypt password hashing.
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
import bcrypt
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# ─── Configuration ────────────────────────────────────────────────────────────

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("DATABASE_URL")


def _database_from_uri(uri: str | None) -> str | None:
    if not uri:
        return None
    parsed = urlparse(uri)
    db_name = parsed.path.lstrip("/").split("/", 1)[0]
    return db_name or None


MONGO_DB = os.getenv("MONGO_DB") or _database_from_uri(MONGO_URI) or "vietrans"
MONGO_CONNECT_TIMEOUT_MS = int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "10000"))
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(64))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REMEMBER_ME_EXPIRE_DAYS = 7

# ─── Mail Configuration ───────────────────────────────────────────────────────

MAIL_USERNAME = os.getenv("MAIL_USERNAME") or None
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD") or None
MAIL_FROM = os.getenv("MAIL_FROM") or None
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

conf: ConnectionConfig | None = None
if MAIL_USERNAME and MAIL_PASSWORD and MAIL_FROM:
    try:
        conf = ConnectionConfig(
            MAIL_USERNAME=MAIL_USERNAME,
            MAIL_PASSWORD=MAIL_PASSWORD,
            MAIL_FROM=MAIL_FROM,
            MAIL_PORT=MAIL_PORT,
            MAIL_SERVER=MAIL_SERVER,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
    except Exception as exc:
        print(f"[Auth] Email is disabled because SMTP settings are invalid: {exc}")

# ─── Security utilities ──────────────────────────────────────────────────────

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ─── MongoDB client (initialized at startup) ─────────────────────────────────

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def init_mongo():
    """Called from app.py startup event to initialize MongoDB connection."""
    global _client, _db
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI is required when auth/history is enabled")

    _client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=MONGO_CONNECT_TIMEOUT_MS)
    await _client.admin.command("ping")
    _db = _client[MONGO_DB]
    # Create unique index on email
    await _db.users.create_index("email", unique=True)
    # Create TTL index on reset_tokens (auto-expire after 1 hour)
    await _db.reset_tokens.create_index("created_at", expireAfterSeconds=3600)
    print(f"[Auth] Connected to MongoDB database '{MONGO_DB}'")


async def close_mongo():
    """Called from app.py shutdown event."""
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise HTTPException(500, "Database not initialized")
    return _db


# ─── Pydantic request/response models ────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100, alias="fullName")
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., alias="confirmPassword")

    class Config:
        populate_by_name = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = Field(False, alias="rememberMe")

    class Config:
        populate_by_name = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128, alias="newPassword")

    class Config:
        populate_by_name = True


class AuthResponse(BaseModel):
    token: str
    user: dict


class MessageResponse(BaseModel):
    message: str
    reset_token: Optional[str] = Field(None, alias="resetToken")

    class Config:
        populate_by_name = True


# ─── Dependency: get current user from JWT ────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(credentials.credentials)
    email = payload.get("sub")
    if email is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")

    db = get_db()
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


# ─── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=MessageResponse)
async def register(req: RegisterRequest):
    """Register a new user account."""
    if req.password != req.confirm_password:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Passwords do not match",
        )

    db = get_db()

    # Check if email already exists
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Email already registered",
        )

    # Create user document
    user_doc = {
        "full_name": req.full_name,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)

    return MessageResponse(message="Account created successfully. Please log in.")


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Authenticate and return a JWT token."""
    db = get_db()

    user = await db.users.find_one({"email": req.email})
    if user is None or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
        )

    # Token lifetime based on "remember me"
    if req.remember_me:
        expires = timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
    else:
        expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    token = create_access_token({"sub": user["email"]}, expires_delta=expires)

    return AuthResponse(
        token=token,
        user={
            "fullName": user["full_name"],
            "email": user["email"],
            "username": user["email"].split("@")[0],
        },
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(req: ForgotPasswordRequest):
    """
    Generate a password reset token.
    """
    db = get_db()

    user = await db.users.find_one({"email": req.email})
    if user is None:
        return MessageResponse(
            message="If that email is registered, a reset link has been sent.",
        )

    reset_token = secrets.token_urlsafe(32)

    reset_url = f"{FRONTEND_BASE_URL}/reset-password?token={reset_token}"
    html = f"""
    <p>Hi,</p>
    <p>We received a request to reset your VieTrans password.</p>
    <p>Click the link below to set a new password:</p>
    <a href="{reset_url}">Reset Password</a>
    <p>If you didn't request this, you can ignore this email.</p>
    """

    # Store reset token in MongoDB
    await db.reset_tokens.insert_one({
        "email": req.email,
        "token": reset_token,
        "created_at": datetime.now(timezone.utc),
    })

    if conf is None:
        return MessageResponse(
            message="Password reset token generated. Email is not configured in this environment.",
            resetToken=reset_token,
        )

    message = MessageSchema(
        subject="VieTrans - Password Reset Request",
        recipients=[req.email],
        body=html,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
    except Exception as e:
        print(f"Failed to send email: {e}")
        return MessageResponse(
            message="Password reset token generated, but email delivery failed.",
            resetToken=reset_token,
        )

    return MessageResponse(
        message="If that email is registered, a reset link has been sent.",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest):
    """Reset password using a valid reset token."""
    db = get_db()

    # Find and consume the reset token
    token_doc = await db.reset_tokens.find_one_and_delete({"token": req.token})
    if token_doc is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid or expired reset token",
        )

    # Update the user's password
    result = await db.users.update_one(
        {"email": token_doc["email"]},
        {
            "$set": {
                "password_hash": hash_password(req.new_password),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    if result.modified_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    return MessageResponse(message="Password reset successfully. Please log in.")


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "fullName": user["full_name"],
        "email": user["email"],
        "username": user["email"].split("@")[0],
        "createdAt": user.get("created_at", "").isoformat() if user.get("created_at") else None,
    }
