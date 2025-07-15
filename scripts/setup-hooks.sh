#!/bin/bash
# Setup script for Rift JavaScript Runtime code quality tools
# This script installs git hooks and configures development environment

set -e

echo "Setting up Rift development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if we're in the right directory
if [ ! -f "CMakeLists.txt" ] || [ ! -d "src" ]; then
    print_status $RED "Error: Please run this script from the Rift project root directory"
    exit 1
fi

# Install pre-commit hook
print_status $YELLOW "Installing pre-commit hook..."
if [ -f "scripts/pre-commit" ]; then
    cp scripts/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    print_status $GREEN "✅ Pre-commit hook installed"
else
    print_status $RED "Error: scripts/pre-commit not found"
    exit 1
fi

# Check for required tools
print_status $YELLOW "Checking for required tools..."

# Check for CMake
if command -v cmake >/dev/null 2>&1; then
    print_status $GREEN "✅ CMake found: $(cmake --version | head -1)"
else
    print_status $RED "❌ CMake not found"
    print_status $YELLOW "Install with: brew install cmake (macOS) or apt-get install cmake (Ubuntu)"
    exit 1
fi

# Check for clang-format
if command -v clang-format >/dev/null 2>&1; then
    print_status $GREEN "✅ clang-format found: $(clang-format --version | head -1)"
else
    print_status $YELLOW "⚠️  clang-format not found"
    print_status $YELLOW "Install with: brew install clang-format (macOS) or apt-get install clang-format (Ubuntu)"
fi

# Check for clang-tidy
if command -v clang-tidy >/dev/null 2>&1; then
    print_status $GREEN "✅ clang-tidy found: $(clang-tidy --version | head -1)"
else
    print_status $YELLOW "⚠️  clang-tidy not found"
    print_status $YELLOW "Install with: brew install llvm (macOS) or apt-get install clang-tidy (Ubuntu)"
fi

# Check for cppcheck
if command -v cppcheck >/dev/null 2>&1; then
    print_status $GREEN "✅ cppcheck found: $(cppcheck --version | head -1)"
else
    print_status $YELLOW "⚠️  cppcheck not found"
    print_status $YELLOW "Install with: brew install cppcheck (macOS) or apt-get install cppcheck (Ubuntu)"
fi

# Configure build directory
print_status $YELLOW "Configuring build directory..."
mkdir -p build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
print_status $GREEN "✅ Build configured"
cd ..

# Build the project
print_status $YELLOW "Building project..."
cd build
make -j$(nproc 2>/dev/null || echo 4)
print_status $GREEN "✅ Project built successfully"
cd ..

# Run a quick test
print_status $YELLOW "Running basic test..."
if ./build/rift test/basic-arithmetic.js >/dev/null 2>&1; then
    print_status $GREEN "✅ Basic test passed"
else
    print_status $RED "❌ Basic test failed"
    exit 1
fi

print_status $GREEN "🎉 Development environment setup complete!"
print_status $YELLOW ""
print_status $YELLOW "Available commands:"
print_status $YELLOW "  make format        - Format all source files"
print_status $YELLOW "  make format-check  - Check formatting without changing files"
print_status $YELLOW "  make clang-tidy    - Run clang-tidy static analysis"
print_status $YELLOW "  make cppcheck      - Run cppcheck static analysis"
print_status $YELLOW "  make quality       - Run all quality checks"
print_status $YELLOW ""
print_status $YELLOW "The pre-commit hook will automatically run these checks before each commit."

exit 0 