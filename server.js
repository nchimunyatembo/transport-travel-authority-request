require('dotenv').config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (for attachments and signature images)
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

// Serve the built React app and route client-side URLs to its entry point.
const frontendPath = path.join(__dirname, 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message, error: { message } });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
