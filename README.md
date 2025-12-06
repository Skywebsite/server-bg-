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

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

