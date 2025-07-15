# Code Quality Tools for Rift JavaScript Runtime

This document describes the comprehensive code quality tools and development workflow for the Rift JavaScript Runtime project.

## 🚀 Quick Start

```bash
# Install git hooks and setup development environment
chmod +x scripts/setup-hooks.sh
./scripts/setup-hooks.sh
```

## 🛠️ Available Tools

### 1. **clang-format** - Code Formatting
Automatically formats C++ code according to consistent style guidelines.

**Configuration**: `.clang-format`
**Usage**:
```bash
make format        # Format all source files
make format-check  # Check formatting without changing files
```

**Key Features**:
- Google-based style with 4-space indentation
- 100-character line limit
- Consistent bracing and spacing
- Automatic include sorting

### 2. **clang-tidy** - Static Analysis
Comprehensive static analysis tool that catches bugs, style issues, and performance problems.

**Configuration**: `.clang-tidy`
**Usage**:
```bash
make clang-tidy    # Run static analysis on all source files
```

**Key Checks**:
- Memory safety issues
- Modern C++ best practices
- Performance optimizations
- Readability improvements
- Bug-prone patterns

### 3. **cppcheck** - Additional Static Analysis
Complementary static analysis tool with different strengths.

**Usage**:
```bash
make cppcheck      # Run cppcheck analysis
```

**Key Features**:
- Memory leak detection
- Buffer overflow detection
- Null pointer dereference
- Unused variable detection

### 4. **Compiler Warnings** - Enhanced Warnings
Comprehensive compiler warnings enabled by default.

**Enabled Warnings**:
- `-Wall -Wextra -Wpedantic`
- `-Wconversion -Wsign-conversion`
- `-Wcast-qual -Wformat=2`
- `-Wundef -Werror=return-type`
- `-Werror=uninitialized`

### 5. **Sanitizers** - Runtime Analysis
Address and undefined behavior sanitizers for runtime error detection.

**Usage**:
```bash
cmake .. -DENABLE_SANITIZERS=ON
make
```

**Features**:
- AddressSanitizer: Memory error detection
- UBSan: Undefined behavior detection
- Use-after-free detection
- Buffer overflow detection

## 📋 Development Workflow

### Pre-commit Hook
The pre-commit hook automatically runs before each commit:

1. **Format Check**: Ensures code is properly formatted
2. **Compilation Check**: Verifies code compiles successfully
3. **Static Analysis**: Runs clang-tidy on modified files
4. **Basic Tests**: Executes fundamental functionality tests

### Manual Quality Checks
Run comprehensive quality checks manually:

```bash
make quality       # Run all quality checks
```

This runs:
- Format checking
- Static analysis (clang-tidy)
- Additional analysis (cppcheck)

### Continuous Integration
For CI/CD pipelines, use:

```bash
# Check formatting
make format-check

# Run static analysis
make clang-tidy
make cppcheck

# Build with sanitizers
cmake .. -DENABLE_SANITIZERS=ON
make

# Run tests
make test
```

## 📁 Configuration Files

### `.clang-format`
Defines code formatting rules:
- Based on Google style
- 4-space indentation
- 100-character line limit
- Automatic include sorting

### `.clang-tidy`
Static analysis configuration:
- Comprehensive check set
- Custom naming conventions
- Performance-focused rules
- Memory safety checks

### `cmake/CodeQuality.cmake`
CMake integration for all tools:
- Automatic tool detection
- Target creation
- Build integration
- Warning configuration

## 🔧 Installation

### macOS (Homebrew)
```bash
brew install llvm clang-format cppcheck cmake
```

### Ubuntu/Debian
```bash
apt-get install clang-tidy clang-format cppcheck cmake build-essential
```

### Arch Linux
```bash
pacman -S clang cmake cppcheck
```

## 📊 Quality Metrics

### Code Coverage
```bash
# Build with coverage
cmake .. -DCMAKE_BUILD_TYPE=Debug -DENABLE_COVERAGE=ON
make
make coverage
```

### Performance Profiling
```bash
# Build with profiling
cmake .. -DCMAKE_BUILD_TYPE=RelWithDebInfo
make
# Run with profiler
valgrind --tool=callgrind ./build/rift test/performance-test.js
```

## 🎯 Best Practices

### Code Style Guidelines
1. **Naming Conventions**:
   - Classes: `PascalCase`
   - Functions: `camelCase`
   - Variables: `snake_case`
   - Constants: `UPPER_CASE`
   - Private members: `trailing_underscore_`

2. **Structure**:
   - Maximum function length: 100 lines
   - Maximum statement count: 50 per function
   - Clear separation of concerns
   - Consistent indentation

3. **Modern C++**:
   - Use `auto` where appropriate
   - Prefer `constexpr` over `const`
   - Use range-based for loops
   - Avoid raw pointers when possible

### Static Analysis Guidelines
1. **Address all clang-tidy warnings**
2. **Fix cppcheck issues**
3. **Maintain clean compilation**
4. **Run sanitizers regularly**

### Testing Guidelines
1. **Write tests for new features**
2. **Maintain test coverage**
3. **Run tests before commits**
4. **Use sanitizers in testing**

## 🚨 Troubleshooting

### Common Issues

#### clang-tidy Not Found
```bash
# macOS
brew install llvm
export PATH="/usr/local/opt/llvm/bin:$PATH"

# Ubuntu
apt-get install clang-tidy
```

#### False Positive Warnings
Add suppressions to `.clang-tidy`:
```yaml
Checks: '*,-specific-warning-name'
```

#### Formatting Conflicts
Run formatting before committing:
```bash
make format
git add .
git commit
```

#### Build Failures
Check compiler warnings:
```bash
make VERBOSE=1
```

## 📈 Continuous Improvement

### Weekly Quality Reviews
1. Review static analysis reports
2. Update tool configurations
3. Address technical debt
4. Improve test coverage

### Tool Updates
```bash
# Update tools regularly
brew upgrade llvm clang-format cppcheck  # macOS
apt-get update && apt-get upgrade clang-tidy clang-format cppcheck  # Ubuntu
```

### Configuration Tuning
- Adjust `.clang-tidy` checks based on project needs
- Update `.clang-format` rules for consistency
- Fine-tune compiler warnings
- Add new quality metrics

## 🏆 Quality Goals

- **100% formatted code** (enforced by pre-commit)
- **Zero clang-tidy warnings** (target)
- **Zero cppcheck issues** (target)
- **Clean compilation** (no warnings)
- **Comprehensive test coverage** (>80%)
- **Memory safety** (verified by sanitizers)

---

*This document is updated regularly. Last updated: December 2024* 