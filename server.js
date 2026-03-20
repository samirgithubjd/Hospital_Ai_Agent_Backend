require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const vapiConfig = require('./config/vapi');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const callRoutes = require('./routes/calls');
const appointmentRoutes = require('./routes/appointments');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(requestLogger);

// Validate VAPI Configuration
try {
  vapiConfig.validate();
} catch (error) {
  console.error('✗ VAPI Configuration Error:', error.message);
  process.exit(1);
}

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    vapi: {
      phoneNumber: vapiConfig.phoneNumber,
      areaCode: vapiConfig.areaCode,
      configured: true
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║  Hospital AI Voice Agent Backend               ║
║  Server running on http://localhost:${PORT}     ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║  VAPI Phone: ${vapiConfig.phoneNumber}       ║
║  Area Code: ${vapiConfig.areaCode}                          ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✓ Server shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
