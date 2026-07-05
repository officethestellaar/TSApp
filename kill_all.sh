#!/bin/bash

# The Stellaar - Emergency Process Kill Switch
# Kills all backend, frontend, and lingering processes

echo "🛑 Stellaar Process Kill Switch"
echo "════════════════════════════════"

# Kill tsx watch processes (backend)
echo "  🔪 Killing tsx processes..."
pkill -f "tsx.*src/index" 2>/dev/null && echo "     ✅ tsx killed" || echo "     ⏺️  none found"

# Kill Next.js processes (frontend)
echo "  🔪 Killing Next.js processes..."
pkill -f "next.*dev" 2>/dev/null && echo "     ✅ Next.js killed" || echo "     ⏺️  none found"
pkill -f "next-router" 2>/dev/null || true

# Kill node processes on our ports
echo "  🔪 Killing processes on port 5001 (backend)..."
fuser -k 5001/tcp 2>/dev/null && echo "     ✅ Port 5001 freed" || echo "     ⏺️  already free"
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

echo "  🔪 Killing processes on port 3000 (frontend)..."
fuser -k 3000/tcp 2>/dev/null && echo "     ✅ Port 3000 freed" || echo "     ⏺️  already free"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait briefly and verify
sleep 2
echo ""
echo "════════════════════════════════"
BACKEND=$(lsof -ti:5001 2>/dev/null || echo "free")
FRONTEND=$(lsof -ti:3000 2>/dev/null || echo "free")
TSX=$(pgrep -f "tsx" 2>/dev/null || echo "none")

if [ "$BACKEND" = "free" ] && [ "$FRONTEND" = "free" ]; then
  echo "✅ All Stellaar processes terminated. Ports are free."
else
  echo "⚠️  Some processes may still be lingering:"
  [ "$BACKEND" != "free" ] && echo "   Port 5001: PID $BACKEND"
  [ "$FRONTEND" != "free" ] && echo "   Port 3000: PID $FRONTEND"
  [ "$TSX" != "none" ] && echo "   tsx: $TSX"
fi
echo "════════════════════════════════"
