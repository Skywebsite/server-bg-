# Backend Server

Backend API server for the BG Remover application.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your API keys to `.env`:
```
BYTEZ_API_KEY=your_api_key_here
```

4. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### POST /api/generate-image
Generate an image from text prompt.

**Request:**
```json
{
  "prompt": "A cat in a wizard hat"
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://cdn.bytez.com/..."
}
```

### POST /api/compress-image
Compress an uploaded image to WebP using Sharp.

**Request:** `multipart/form-data` with field `image` (max 15MB). Optional `quality` (1-100, default 80) and `width` (default 1600, keeps aspect ratio).

**Response:**
```json
{
  "success": true,
  "mimeType": "image/webp",
  "dataUrl": "data:image/webp;base64,...",
  "originalSize": 123456,
  "compressedSize": 45678,
  "quality": 80,
  "width": 1600
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

