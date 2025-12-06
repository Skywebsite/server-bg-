import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Bytez from 'bytez.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in server directory
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
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

