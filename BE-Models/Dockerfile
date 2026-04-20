# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for OpenCV and other libraries
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY server/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create dummy results folder if not exists
RUN mkdir -p outputs/results/live

# Set Environment Variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces uses port 7860 by default
EXPOSE 7860

# Run the application
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"]
