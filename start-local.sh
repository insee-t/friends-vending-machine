#!/bin/bash

# Local Development Setup Script
echo "🚀 Starting Friends Vending Machine locally..."

# Install dependencies if not already installed
echo "📦 Installing dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Start the server in background
echo "🖥️ Starting server..."
cd server
npm start &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 3

# Start the Next.js development server
echo "🌐 Starting Next.js development server..."
npm run dev

# Cleanup function
cleanup() {
    echo "🛑 Stopping servers..."
    kill $SERVER_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Wait for user to stop
wait
