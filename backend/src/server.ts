import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import feedRoutes from './routes/feed';
import notificationRoutes from './routes/notifications';
import politicalRoutes from './routes/political';
import messageRoutes from './routes/messages';
import { initializeWebSocket } from './websocket';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const io = initializeWebSocket(httpServer);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/political', politicalRoutes);
app.use('/api/messages', messageRoutes);

// Test route
app.get('/health', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      websocket: 'Active',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      database: 'Disconnected',
      websocket: 'Unknown'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Use httpServer instead of app for WebSocket support
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server active`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});