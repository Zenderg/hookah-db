import express from 'express';
import type { Brand } from '@hookah-db/types';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Hookah Tobacco Database API is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify type imports work
app.get('/api/v1/test', (_req, res) => {
  const testBrand: Brand = {
    slug: 'test',
    name: 'Test Brand',
    nameEn: 'Test Brand',
    description: 'Test description',
    country: 'Test Country',
    website: null,
    foundedYear: null,
    status: 'active',
    imageUrl: null,
    rating: 5,
    ratingsCount: 0,
    reviewsCount: 0,
    viewsCount: 0,
    lines: [],
    flavors: []
  };

  res.json({
    message: 'Type imports working correctly',
    data: testBrand
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hookah Tobacco Database API is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/v1/test`);
});
