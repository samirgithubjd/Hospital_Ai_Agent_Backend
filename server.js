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
const slotRoutes = require('./routes/slots');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
// Enable CORS for all routes (configure as needed) remove when push code to production
app.use(cors());

// CORS Configuration - Allow frontend origins
// app.use(cors({
//   origin: function (origin, callback) {
//     // Allowed origins
//     const allowedOrigins = [
//       'http://localhost:3000',
//       'http://localhost:3001',
//       'http://127.0.0.1:3000',
//       'http://127.0.0.1:3001',
//       // Add any other frontend URLs here (e.g., deployed frontend)
//     ];

//     // Allow ngrok URLs and localhost
//     if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('ngrok')) {
//       callback(null, true);
//     } else if (allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('CORS not allowed for this origin'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

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
app.use('/api/slots', slotRoutes);

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
║  Server running on http://localhost:${PORT}    ║
║  Environment: ${process.env.NODE_ENV || 'development'} ║
║  VAPI Phone: ${vapiConfig.phoneNumber}         ║
║  Area Code: ${vapiConfig.areaCode}             ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✓ Server shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
