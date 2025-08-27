#!/bin/bash
# Install Socket.IO dependencies for WebSocket support

cd backend

# Production dependencies
npm install socket.io@4.7.5
npm install socket.io-client@4.7.5

# TypeScript types
npm install --save-dev @types/socket.io@3.0.2

echo "Socket.IO dependencies installed successfully!"
echo "Please run 'npm run build' to compile the TypeScript files."