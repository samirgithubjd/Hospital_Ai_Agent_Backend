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
const agentRoutes = require('./routes/agents');
const vapiToolRoutes = require('./routes/vapiTools');

// Initialize Express app
const app = express();

// Middleware - IMPORTANT ORDER!
// 1. JSON/URL Body Parser (MUST be first)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 2. CORS
app.use(cors());

// 3. Request Logging for debugging
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body received:', req.body ? '✓ YES' : '✗ NO');
  }
  next();
});

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
app.use('/api/agents', agentRoutes);
app.use('/api/vapi-tools', vapiToolRoutes);

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



// patient token
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJkMTI2OGU4ZjQxZGIzYjRkYTE1YTMiLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTc3NDUxNDE0NCwiZXhwIjoxNzc1MTE4OTQ0fQ.QI0nAbQwcAlKKBCA7GafW65nQ6KS4WktXJtfg4c7T98

// doctor token
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJkMTI2ODhlODQxZGIzYjRkYTE1YTIiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzc0NTE0MTQ0LCJleHAiOjE3NzUxMTg5NDR9.7n8sKqj8mLhH4e7Zt3uXoVh8l6aWz5sXoFvPz9b8w

// admin token
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJkMTI2ODhlODQxZGIzYjRkYTE1YTIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzQ1MTQxNDQsImV4cCI6MTc3NTExODk0NH0.7n8sKqj8mLhH4e7Zt3uXoVh8l6aWz5sXoFvPz9b8w