"""
VieTrans Auth Module
────────────────────
Authentication endpoints: Register, Login, Forgot/Reset Password, Profile.
Uses MongoDB (motor async driver), JWT tokens, and bcrypt password hashing.
"""
from __future__ import annotations

import os
import secrets
import hashlib
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
import bcrypt
import httpx
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

SERVER_DIR = Path(__file__).resolve().parent
load_dotenv(SERVER_DIR / ".env")

# ─── Configuration ────────────────────────────────────────────────────────────

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "vietrans")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if ENVIRONMENT in {"prod", "production"}:
        raise RuntimeError("SECRET_KEY must be set in production")
    SECRET_KEY = secrets.token_urlsafe(64)
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "https://vietrans-projects.netlify.app").rstrip("/")
DEFAULT_GOOGLE_CLIENT_ID = "49147050548-0h30og1tgnkp2k0q8eqjc90uojqsn5bv.apps.googleusercontent.com"
GOOGLE_CLIENT_ID = (os.getenv("GOOGLE_CLIENT_ID") or DEFAULT_GOOGLE_CLIENT_ID).strip()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REMEMBER_ME_EXPIRE_DAYS = 7
API_KEY_PREFIX = "vt_live_"
RESET_TOKEN_TTL_SECONDS = int(os.getenv("RESET_TOKEN_TTL_SECONDS", "3600"))
ALLOW_DEV_RESET_TOKEN = os.getenv("ALLOW_DEV_RESET_TOKEN", "").strip().lower() in {"1", "true", "yes", "on"}

# ─── Mail Configuration ───────────────────────────────────────────────────────

logger = logging.getLogger("vietrans.auth")


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


MAIL_USERNAME = (os.getenv("MAIL_USERNAME") or "").strip()
MAIL_PASSWORD = (os.getenv("MAIL_PASSWORD") or "").strip()
MAIL_FROM = (os.getenv("MAIL_FROM") or "").strip()
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_SERVER = (os.getenv("MAIL_SERVER") or "smtp.gmail.com").strip()
MAIL_STARTTLS = _env_bool("MAIL_STARTTLS", True)
MAIL_SSL_TLS = _env_bool("MAIL_SSL_TLS", False)
RESEND_API_KEY = (os.getenv("RESEND_API_KEY") or "").strip()
RESEND_FROM = (os.getenv("RESEND_FROM") or MAIL_FROM).strip()
RESEND_API_URL = (os.getenv("RESEND_API_URL") or "https://api.resend.com/emails").strip()

if MAIL_SERVER.lower() == "smtp.gmail.com" and MAIL_PASSWORD:
    MAIL_PASSWORD = MAIL_PASSWORD.replace(" ", "")


def _mail_missing_config() -> list[str]:
    required = {
        "MAIL_USERNAME": MAIL_USERNAME,
        "MAIL_PASSWORD": MAIL_PASSWORD,
        "MAIL_FROM": MAIL_FROM,
        "MAIL_SERVER": MAIL_SERVER,
    }
    return [name for name, value in required.items() if not value]


def _mail_context() -> str:
    return (
        f"server={MAIL_SERVER or '<missing>'} port={MAIL_PORT} "
        f"starttls={MAIL_STARTTLS} ssl_tls={MAIL_SSL_TLS} "
        f"username_set={bool(MAIL_USERNAME)} password_set={bool(MAIL_PASSWORD)} "
        f"from_set={bool(MAIL_FROM)}"
    )


def _email_provider() -> str:
    return "resend" if RESEND_API_KEY else "smtp"


def _email_missing_config() -> list[str]:
    if _email_provider() == "resend":
        return [name for name, value in {"RESEND_FROM": RESEND_FROM}.items() if not value]
    return _mail_missing_config()


def _email_context() -> str:
    if _email_provider() == "resend":
        return (
            f"provider=resend endpoint={RESEND_API_URL or '<missing>'} "
            f"api_key_set={bool(RESEND_API_KEY)} from_set={bool(RESEND_FROM)}"
        )
    return "provider=smtp " + _mail_context()


def _validate_email_delivery_config() -> None:
    missing = _email_missing_config()
    if missing:
        raise RuntimeError("Missing email configuration: " + ", ".join(missing))


def _build_mail_config() -> ConnectionConfig:
    missing = _mail_missing_config()
    if missing:
        raise RuntimeError("Missing mail configuration: " + ", ".join(missing))

    return ConnectionConfig(
        MAIL_USERNAME=MAIL_USERNAME,
        MAIL_PASSWORD=MAIL_PASSWORD,
        MAIL_FROM=MAIL_FROM,
        MAIL_PORT=MAIL_PORT,
        MAIL_SERVER=MAIL_SERVER,
        MAIL_STARTTLS=MAIL_STARTTLS,
        MAIL_SSL_TLS=MAIL_SSL_TLS,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


async def _send_password_reset_email(recipient: str, reset_url: str, html: str) -> None:
    subject = "VieTrans - Password Reset Request"
    if _email_provider() == "resend":
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": RESEND_FROM,
                    "to": [recipient],
                    "subject": subject,
                    "html": html,
                },
            )
        if response.status_code >= 400:
            detail = response.text[:500]
            raise RuntimeError(f"Resend API returned HTTP {response.status_code}: {detail}")
        return

    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=html,
        subtype=MessageType.html,
    )
    fm = FastMail(_build_mail_config())
    await fm.send_message(message)

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


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_api_key() -> str:
    return f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def _token_expiry(remember_me: bool = False) -> timedelta:
    return timedelta(days=REMEMBER_ME_EXPIRE_DAYS) if remember_me else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)


def _normalize_email(value: str | EmailStr) -> str:
    return str(value).strip().lower()


def _user_payload(user: dict) -> dict:
    return {
        "fullName": user["full_name"],
        "email": user["email"],
        "username": user["email"].split("@")[0],
        "avatar": user.get("avatar") or user.get("google_picture"),
    }


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
    _client = AsyncIOMotorClient(MONGO_URI)
    _db = _client[MONGO_DB]
    # Create unique index on email
    await _db.users.create_index("email", unique=True)
    # Create TTL index on reset_tokens (auto-expire after 1 hour)
    await _db.reset_tokens.create_index("created_at", expireAfterSeconds=RESET_TOKEN_TTL_SECONDS)
    await _db.api_keys.create_index("key_hash", unique=True)
    await _db.api_keys.create_index("user_email", unique=True)
    await _db.users.create_index("google_sub", unique=True, sparse=True)
    print(f"[Auth] Connected to MongoDB")


async def close_mongo():
    """Called from app.py shutdown event."""
    global _client
    if _client:
        _client.close()


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise HTTPException(500, "Database not initialized")
    return _db


# ─── Pydantic request/response models ────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100, alias="fullName")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., alias="confirmPassword")

    class Config:
        populate_by_name = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = Field(False, alias="rememberMe")

    class Config:
        populate_by_name = True


class GoogleLoginRequest(BaseModel):
    credential: str = Field(..., min_length=20)
    remember_me: bool = Field(True, alias="rememberMe")

    class Config:
        populate_by_name = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128, alias="newPassword")

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


class ApiKeyInfoResponse(BaseModel):
    has_key: bool = Field(..., alias="hasKey")
    last_four: Optional[str] = Field(None, alias="lastFour")
    created_at: Optional[str] = Field(None, alias="createdAt")
    last_used_at: Optional[str] = Field(None, alias="lastUsedAt")

    class Config:
        populate_by_name = True


class ApiKeyResponse(ApiKeyInfoResponse):
    api_key: str = Field(..., alias="apiKey")


def _dt_to_iso(value) -> Optional[str]:
    return value.isoformat() if hasattr(value, "isoformat") else None


def _api_key_info(doc) -> dict:
    if not doc:
        return {
            "hasKey": False,
            "lastFour": None,
            "createdAt": None,
            "lastUsedAt": None,
        }
    return {
        "hasKey": True,
        "lastFour": doc.get("last_four"),
        "createdAt": _dt_to_iso(doc.get("created_at")),
        "lastUsedAt": _dt_to_iso(doc.get("last_used_at")),
    }


def _is_reset_token_expired(created_at) -> bool:
    if not hasattr(created_at, "tzinfo"):
        return True
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created_at > timedelta(seconds=RESET_TOKEN_TTL_SECONDS)


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
    email = _normalize_email(email)

    db = get_db()
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def get_user_by_api_key(api_key: str):
    key = (api_key or "").strip()
    if not key.startswith(API_KEY_PREFIX):
        return None

    db = get_db()
    doc = await db.api_keys.find_one({"key_hash": hash_api_key(key)})
    if doc is None:
        return None

    user = await db.users.find_one({"email": _normalize_email(doc["user_email"])})
    if user is None:
        return None

    await db.api_keys.update_one(
        {"_id": doc["_id"]},
        {"$set": {"last_used_at": datetime.now(timezone.utc)}},
    )
    return user


def _verify_google_credential_sync(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google sign-in is not configured",
        )

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "google-auth dependency is not installed",
        )

    try:
        return id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential")


async def verify_google_credential(credential: str) -> dict:
    idinfo = await asyncio.to_thread(_verify_google_credential_sync, credential)
    if not idinfo.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential")
    if not idinfo.get("email") or not idinfo.get("email_verified"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google email is not verified")
    return idinfo


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
    email = _normalize_email(req.email)
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Email already registered",
        )

    # Create user document
    user_doc = {
        "full_name": req.full_name,
        "email": email,
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
    email = _normalize_email(req.email)

    user = await db.users.find_one({"email": email})
    if user is None or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
        )

    token = create_access_token({"sub": user["email"]}, expires_delta=_token_expiry(req.remember_me))

    return AuthResponse(
        token=token,
        user=_user_payload(user),
    )


@router.post("/google", response_model=AuthResponse)
async def login_with_google(req: GoogleLoginRequest):
    """Authenticate with a verified Google ID token and return a VieTrans JWT."""
    idinfo = await verify_google_credential(req.credential)
    db = get_db()
    now = datetime.now(timezone.utc)
    google_sub = idinfo["sub"]
    email = _normalize_email(idinfo["email"])
    full_name = (idinfo.get("name") or email.split("@")[0]).strip()
    picture = idinfo.get("picture")

    user = await db.users.find_one({"google_sub": google_sub})
    if user is None:
        user = await db.users.find_one({"email": email})
        if user is None:
            user_doc = {
                "full_name": full_name,
                "email": email,
                "password_hash": hash_password(secrets.token_urlsafe(48)),
                "google_sub": google_sub,
                "google_picture": picture,
                "auth_provider": "google",
                "created_at": now,
                "updated_at": now,
            }
            await db.users.insert_one(user_doc)
            user = user_doc
        else:
            updates = {
                "google_sub": google_sub,
                "google_picture": picture,
                "updated_at": now,
            }
            if not user.get("full_name"):
                updates["full_name"] = full_name
            await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
            user = await db.users.find_one({"_id": user["_id"]})

    token = create_access_token({"sub": user["email"]}, expires_delta=_token_expiry(req.remember_me))
    return AuthResponse(token=token, user=_user_payload(user))


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(req: ForgotPasswordRequest):
    """
    Generate a password reset token.
    """
    db = get_db()
    email = _normalize_email(req.email)

    user = await db.users.find_one({"email": email})
    if user is None:
        return MessageResponse(
            message="If that email is registered, a reset link has been sent.",
        )

    try:
        _validate_email_delivery_config()
    except Exception as e:
        logger.exception("Password reset email provider is not configured")
        print(f"[Auth] Password reset email provider is not configured: {type(e).__name__}: {e}; {_email_context()}")
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Password reset email could not be sent. Please try again later.",
        )

    reset_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)

    await db.reset_tokens.delete_many({"email": email})
    await db.reset_tokens.insert_one({
        "email": email,
        "token_hash": hash_reset_token(reset_token),
        "created_at": now,
    })

    # Send email
    reset_url = f"{FRONTEND_BASE_URL}/reset-password?{urlencode({'token': reset_token})}"
    html = f"""
    <p>Hi,</p>
    <p>We received a request to reset your VieTrans password.</p>
    <p>Click the link below to set a new password:</p>
    <a href="{reset_url}">Reset Password</a>
    <p>If you didn't request this, you can ignore this email.</p>
    """

    try:
        await _send_password_reset_email(email, reset_url, html)
    except Exception as e:
        logger.exception("Password reset email delivery failed")
        print(f"[Auth] Password reset email delivery failed: {type(e).__name__}: {e}; {_email_context()}")
        if ENVIRONMENT not in {"prod", "production"} and ALLOW_DEV_RESET_TOKEN:
            return MessageResponse(
                message="Email delivery failed; use resetToken for local development.",
                resetToken=reset_token,
            )
        await db.reset_tokens.delete_one({"token_hash": hash_reset_token(reset_token)})
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Password reset email could not be sent. Please try again later.",
        )

    return MessageResponse(
        message="If that email is registered, a reset link has been sent.",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest):
    """Reset password using a valid reset token."""
    db = get_db()
    reset_token = req.token.strip()
    if not reset_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reset token")

    # Find and consume the reset token
    token_doc = await db.reset_tokens.find_one_and_delete({
        "$or": [
            {"token_hash": hash_reset_token(reset_token)},
            {"token": reset_token},
        ]
    })
    if token_doc is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid or expired reset token",
        )
    if _is_reset_token_expired(token_doc.get("created_at")):
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
        "avatar": user.get("avatar") or user.get("google_picture"),
        "createdAt": user.get("created_at", "").isoformat() if user.get("created_at") else None,
    }


@router.get("/api-key", response_model=ApiKeyInfoResponse)
async def get_api_key_info(user=Depends(get_current_user)):
    """Return metadata for the current user's API key."""
    db = get_db()
    doc = await db.api_keys.find_one({"user_email": user["email"]})
    return _api_key_info(doc)


@router.post("/api-key", response_model=ApiKeyResponse)
async def generate_api_key(user=Depends(get_current_user)):
    """Create or replace the current user's API key."""
    db = get_db()
    now = datetime.now(timezone.utc)
    api_key = create_api_key()
    doc = {
        "user_email": user["email"],
        "key_hash": hash_api_key(api_key),
        "last_four": api_key[-4:],
        "created_at": now,
        "last_used_at": None,
    }
    await db.api_keys.replace_one({"user_email": user["email"]}, doc, upsert=True)
    return {
        **_api_key_info(doc),
        "apiKey": api_key,
    }


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., min_length=8, max_length=128, alias="newPassword")

    class Config:
        populate_by_name = True


@router.post("/change-password", response_model=MessageResponse)
async def change_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    """Change the authenticated user's password after verifying the current one."""
    if not verify_password(req.current_password, user["password_hash"]):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Current password is incorrect",
        )

    db = get_db()
    result = await db.users.update_one(
        {"email": user["email"]},
        {
            "$set": {
                "password_hash": hash_password(req.new_password),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    if result.modified_count == 0:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update password")

    return MessageResponse(message="Password changed successfully.")
