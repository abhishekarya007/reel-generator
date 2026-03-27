# Use Python 3.10 slim to ensure minimal image size but standard architecture 
FROM python:3.10-slim

# Install FFMPEG explicitly for video manipulation
# Include common codecs recursively inside the apt package natively
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set standard working directory
WORKDIR /app

# Ensure we map and install the requirements securely
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Securely copy source code
COPY . .

# Expose port (Render sets $PORT dynamically, but Railway relies on EXPOSE if absent)
EXPOSE 8000

# Start FastAPI Application
# Note: we use sh -c to safely evaluate $PORT if the cloud operator injects it
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
