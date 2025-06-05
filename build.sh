#!/bin/bash

# Create build directory
mkdir -p build
cd build

# Configure with CMake
cmake ..

# Build the project (use sysctl for macOS, nproc for Linux)
if command -v nproc > /dev/null; then
    make -j$(nproc)
elif command -v sysctl > /dev/null; then
    make -j$(sysctl -n hw.ncpu)
else
    make -j4
fi

echo "Build complete! Executable is at: build/jsruntime" 