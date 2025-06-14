#!/bin/bash

# Build script for Rift REPL
set -e

echo "Building Rift REPL..."

# Create build directory if it doesn't exist
mkdir -p build

# Navigate to build directory
cd build

# Run CMake
cmake ..

# Build the project
make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

echo "REPL built successfully! Run './rift-repl' to start." 