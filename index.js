import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Bytez from 'bytez.js';
import multer from 'multer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in server directory
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;

// Upload middleware (store files in memory for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit to keep processing fast
  }
});

// CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Image compression endpoint
app.post('/api/compress-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Clamp and sanitize user options
    const qualityInput = parseInt(req.body?.quality, 10);
    const widthInput = parseInt(req.body?.width, 10);
    const formatInput = (req.body?.format || 'webp').toLowerCase();

    const quality = Number.isFinite(qualityInput) 
      ? Math.min(Math.max(qualityInput, 1), 100) 
      : 80;

    const targetWidth = Number.isFinite(widthInput) && widthInput > 0 
      ? widthInput 
      : 1600;

    // Prepare sharp pipeline
    let image = sharp(req.file.buffer, { failOnError: false })
      .rotate() // honor EXIF orientation
      .resize({
        width: targetWidth,
        fit: 'inside',
        withoutEnlargement: true
      });

    // Decide output format
    const inputMime = req.file.mimetype || '';
    let mimeType = 'image/webp';

    if (formatInput === 'original') {
      if (inputMime.includes('jpeg') || inputMime.includes('jpg')) {
        image = image.jpeg({ quality, mozjpeg: true });
        mimeType = 'image/jpeg';
      } else if (inputMime.includes('png')) {
        image = image.png({ compressionLevel: 9, adaptiveFiltering: true });
        mimeType = 'image/png';
      } else {
        // fallback to webp
        image = image.webp({ quality });
        mimeType = 'image/webp';
      }
    } else {
      // default to webp
      image = image.webp({ quality });
      mimeType = 'image/webp';
    }

    const compressedBuffer = await image.toBuffer();

    const dataUrl = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;

    return res.json({
      success: true,
      mimeType,
      dataUrl,
      originalSize: req.file.size,
      compressedSize: compressedBuffer.length,
      quality,
      width: targetWidth
    });
  } catch (error) {
    console.error('Image compression error:', error);
    return res.status(500).json({ 
      error: 'Failed to compress image. Please try again with a different file.' 
    });
  }
});

// Text to Image endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }

    // Get API key from environment variables
    const bytezKey = process.env.BYTEZ_API_KEY;
    
    if (!bytezKey) {
      return res.status(500).json({ 
        error: 'Bytez API key is not configured' 
      });
    }

    // Initialize Bytez SDK
    const sdk = new Bytez(bytezKey);
    const model = sdk.model('stabilityai/stable-diffusion-xl-base-1.0');

    // Generate image
    const { error, output } = await model.run(prompt.trim());

    if (error) {
      console.error('Image generation error:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed to generate image' 
      });
    }

    if (!output) {
      return res.status(500).json({ 
        error: 'No output received from the API' 
      });
    }

    // Extract image URL
    let imageUrl = null;
    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (output && typeof output === 'object') {
      imageUrl = output.url || output.image || output.data;
    }

    if (!imageUrl) {
      return res.status(500).json({ 
        error: 'Could not extract image URL from response' 
      });
    }

    res.json({ 
      success: true, 
      imageUrl 
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

// Start server
app.listen(PORT, 'localhost', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 API Key loaded: ${process.env.BYTEZ_API_KEY ? 'Yes' : 'No'}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the process using that port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

