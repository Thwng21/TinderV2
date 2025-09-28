const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import routes
const authRoutes = require('./Routes/authRoutes');
const userRoutes = require('./Routes/userRoutes');
const matchRoutes = require('./Routes/matchRoutes');
const messageRoutes = require('./Routes/messageRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true,
  optionSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
console.log('🔄 Attempting to connect to MongoDB Atlas...');
console.log('📍 Connection URI:', process.env.MONGODB_URI ? 'URI found' : 'URI missing');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully');
    console.log('🗄️  Database ready for storing user data');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n🚨 IMPORTANT: Data will NOT be saved to database!');
    console.log('⚠️  Server running in MOCK MODE for development');
    console.log('\n💡 To fix this issue:');
    console.log('   1. 🌐 Go to https://cloud.mongodb.com');
    console.log('   2. 🔐 Login to your MongoDB Atlas account');
    console.log('   3. 🏠 Select TinderV2 project');
    console.log('   4. 🔒 Go to Network Access → Add IP Address');
    console.log('   5. ➕ Add your current IP or 0.0.0.0/0 (for all IPs)');
    console.log('   6. 💾 Save and wait 2-3 minutes');
    console.log('   7. 🔄 Restart this server');
    console.log('\n🔧 Current error details:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'OK',
    message: 'Tinder V2 API is running',
    database: {
      status: dbStates[dbStatus] || 'unknown',
      readyState: dbStatus,
      connected: dbStatus === 1
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // Validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
});

// Socket.IO setup
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: corsOptions
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);
  
  // Join user to their personal room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their room`);
  });
  
  // Handle sending messages
  socket.on('send_message', (data) => {
    // Emit message to the recipient
    socket.to(data.recipientId).emit('receive_message', data);
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(data.recipientId).emit('user_typing', data);
  });
  
  socket.on('stop_typing', (data) => {
    socket.to(data.recipientId).emit('user_stop_typing', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`👤 User disconnected: ${socket.id}`);
  });
});

// Make io available globally
app.set('io', io);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
