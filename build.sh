#!/bin/bash
set -e

echo "=== Current working directory ==="
pwd

echo "=== Before build ==="
ls -la

echo "=== Running build ==="
npm ci && npm run build

echo "=== After build ==="
ls -la

echo "=== Checking dist directory ==="
if [ -d "dist" ]; then
    echo "✅ dist directory exists"
    ls -la dist/
else
    echo "❌ dist directory does not exist"
    echo "Looking for build output in other locations..."
    find . -name "index.html" -type f
fi

echo "=== Build script completed ==="