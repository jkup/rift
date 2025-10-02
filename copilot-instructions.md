# CLAUDE.md - Essential Guide for Working on Rift JavaScript Runtime

**Last updated: July 19, 2025**

---

## 📚 Quick Reference & Docs

| Task                      | Command / Location                                                      |
| ------------------------- | ----------------------------------------------------------------------- |
| Build (recommended)       | `./build.sh`                                                            |
| Manual build              | `mkdir -p build && cd build && cmake .. && make -j$(sysctl -n hw.ncpu)` |
| Run JS file               | `./build/rift path/to/script.js`                                        |
| Run JS code (inline)      | `./build/rift -e "console.log('hi')"`                                   |
| Run custom tests          | `npm test` or `node test-runner.js`                                     |
| Run Test262 suite         | `npm run test262` or `node test262-runner.js`                           |
| Run specific Test262 test | `node test262-runner.js path/to/test.js`                                |
| Format code               | `cd build && make format`                                               |
| Check formatting          | `cd build && make format-check`                                         |
| Static analysis           | `cd build && make cppcheck`                                             |
| All code quality checks   | `cd build && make quality`                                              |
| Docs: GC plan             | `docs/gc-implementation-plan.md`                                        |
| Docs: Code quality        | `docs/CODE_QUALITY.md`                                                  |
| Docs: Test262 CI          | `docs/CI_TEST262_GUIDE.md`                                              |
| Docs: Test262 blockers    | `docs/TEST262_BLOCKERS.md`                                              |
| Test262 authoring guide   | `test262/CONTRIBUTING.md`                                               |

---

## 🏆 Best Practices & Code Style (C++)

- **ECMAScript Compliance**: All features and fixes must follow ECMAScript specification. Reference https://262.ecma-international.org/16.0/index.html for official behavior and implementation details.
- **Naming**: Classes `PascalCase`, functions `camelCase`, variables `snake_case`, constants `UPPER_CASE`, private members `trailing_underscore_`.
- **Structure**: Max 100 lines per function, 50 statements per function, clear separation of concerns.
- **Modern C++**: Use `auto` where appropriate, prefer `constexpr`, use range-based for, avoid raw pointers unless GC-managed.
- **Exception Handling**:
  - ⚠️ **NEVER use `catch(...)` - it swallows ALL exceptions including system errors**
  - Always catch specific exception types: `catch(const std::exception& e)` or `catch(const std::invalid_argument&)`
  - For `std::stod()`, `std::stoi()`, etc., catch `std::invalid_argument` and `std::out_of_range`
  - Log unexpected exceptions with `std::cerr` for debugging: `std::cerr << "Warning: " << e.what() << std::endl;`
  - Add `#include <iostream>` when using `std::cerr` or `std::endl`
  - Add `#include <limits>` when using `std::numeric_limits`
- **Formatting**: Use `make format` before committing. 4-space indent, 100-char line limit.
- **Static analysis**: Address all `clang-tidy` and `cppcheck` warnings. Run sanitizers regularly.

---

## 📝 How to Add a New Feature (Checklist)

1. **Plan**: Identify where the feature fits (e.g. built-in, parser, runtime).
2. **Implement**: Add code in the appropriate `src/` subfolder.
3. **Test**: Add/modify tests in `test/` or relevant Test262 files.
4. **Build**: Run `./build.sh` and ensure no errors.
5. **Run tests**: `npm test` and/or `node test262-runner.js --include="<feature>"`
6. **Check code quality**: `cd build && make quality`
7. **Update docs**: If needed, update this file or related docs.
8. **Commit**: Format code, commit, and push.

---

## 🐞 Debugging & Troubleshooting

- **Build fails**: Ensure C++23 support, clean build (`rm -rf build && ./build.sh`).
- **Segfaults**: Usually GC shutdown; see `docs/gc-implementation-plan.md`.
- **Test262 failures**: Many are expected; focus on your feature, check `docs/TEST262_BLOCKERS.md`.
- **Memory issues**: Use sanitizers (`cmake .. -DENABLE_SANITIZERS=ON`), enable GC debug output in `CMakeLists.txt`.
- **Formatting/static analysis**: Run `make format`, `make format-check`, `make cppcheck`.
- **Node/npm issues**: Use Node.js 14+; run `npm install` after cloning.

---

## 🎯 Project Overview

**Rift** is a JavaScript runtime implementation written in C++ with robust garbage collection and comprehensive JavaScript language support. It's designed as a learning/hobby project that demonstrates the implementation of a modern JavaScript engine with:

- ✅ **Mark-sweep garbage collection** with memory-safe execution
- ✅ **Comprehensive JavaScript language support** including closures, prototypes, exception handling
- ✅ **Rich built-in object library** (Array, String, Math, Object, Console, Boolean, Error)
- ✅ **Test262 integration** for ECMAScript compliance testing
- ✅ **Modern C++ architecture** with proper memory management

## 📁 Project Structure

```
rift/
├── src/                          # Core C++ implementation
│   ├── main.cpp                  # Entry point
│   ├── api/                      # Public JavaScript API
│   ├── core/engine/              # Main execution engine
│   │   ├── engine.cpp            # Core Rift engine
│   │   ├── expression_evaluator.cpp
│   │   ├── statement_evaluator.cpp
│   │   └── builtin_manager.cpp   # Built-in object setup
│   ├── frontend/                 # Lexer & Parser
│   │   ├── lexer/
│   │   └── parser/
│   ├── runtime/                  # Runtime value system
│   │   ├── values/               # Value & JSObject implementation
│   │   └── environment/          # Variable scoping
│   ├── memory/                   # Garbage collection system
│   │   ├── mark_sweep_gc.cpp     # GC implementation
│   │   ├── object_manager.cpp    # Object lifecycle
│   │   └── object_factory.cpp    # GC-aware object creation
│   └── builtins/                 # JavaScript built-in objects
│       ├── console/, math/, global/, array/
│       ├── string/, object/, boolean/, error/
├── include/rift/                 # Header files (mirrors src/)
├── test/                         # Custom test suite
├── test262/                      # Official ECMAScript test suite
├── build/                        # Build output directory
├── cmake/                        # CMake modules
├── docs/                         # Documentation
├── .github/workflows/            # CI/CD configuration
├── build.sh                      # Main build script
├── CMakeLists.txt               # Build configuration
├── package.json                 # Node.js dependencies for test runners
├── test-runner.js               # Custom test runner
└── test262-runner.js            # Test262 compliance runner
```

## 🔧 Build System

### Primary Build Method

```bash
# Main build script (recommended)
./build.sh
```

This script:

- Creates `build/` directory
- Runs CMake configuration
- Builds with optimal parallel compilation
- Outputs `build/rift` executable

### Manual CMake Build

```bash
mkdir -p build && cd build
cmake ..
make -j$(nproc)  # Linux
make -j$(sysctl -n hw.ncpu)  # macOS
```

### Requirements

- **C++23** compatible compiler (GCC/Clang)
- **CMake 3.16+**
- **Node.js 14+** (for test runners)

## 🏃 Running the Runtime

### Execute JavaScript Files

```bash
./build/rift path/to/script.js
```

### Execute JavaScript Code Directly

```bash
./build/rift -e "console.log('Hello, World!');"
./build/rift -e "var arr = [1,2,3]; arr.push(4); console.log(arr.length);"
```

### Show Help

```bash
./build/rift -h
```

## 🧪 Testing Framework

### Custom Test Suite

```bash
npm test                    # Run custom test suite
# or
node test-runner.js
```

### Test262 Compliance Testing

```bash
npm run test262            # Run full Test262 suite (slow)
node test262-runner.js     # Same as above

# Run specific test patterns
node test262-runner.js --include="language/expressions/addition"

# Run single test
node test262-runner.js test/language/expressions/addition/S11.6.1_A3.1_T2.1.js
```

### Playground/Demo Mode

```bash
npm run playground         # Quick demo execution
```

## 🔍 Code Quality & CI/CD

### Available Make Targets (after cmake)

```bash
cd build/

# Code formatting
make format              # Auto-format all source files
make format-check        # Check formatting (CI)

# Static analysis
make cppcheck           # Run cppcheck static analysis

# All quality checks
make quality            # Run format-check + cppcheck
```

### GitHub Actions Workflows

1. **CI Pipeline** (`.github/workflows/ci.yml`)

   - **Code Quality**: format-check, cppcheck, clang-tidy
   - **Multi-compiler builds**: GCC, Clang
   - **Sanitizer builds**: AddressSanitizer, UBSan
   - **Basic functionality tests**

2. **Test262 Quick Check** (`.github/workflows/test262-quick.yml`)

   - Runs focused Test262 subset on PRs
   - ~5-15 minute feedback
   - Posts PR comments with results

3. **Test262 Comparison** (`.github/workflows/test262-comparison.yml`)
   - Full Test262 suite comparison (PR vs main)
   - ~30-45 minutes
   - Detailed compatibility reports

## 🏗️ Architecture Deep Dive

### Core Engine (`src/core/engine/`)

- **Rift**: Main coordinator class
- **ExpressionEvaluator**: Handles expressions (literals, operators, calls)
- **StatementEvaluator**: Handles statements (control flow, declarations)
- **BuiltinManager**: Sets up built-in objects and prototypes

### Memory Management (`src/memory/`)

**Architecture**: Single-ownership GC model (fixed from broken mixed ownership)

- **ObjectManager**: Central object lifecycle management
- **ObjectFactory**: GC-aware object creation (replaces `std::make_shared`)
- **MarkSweepGC**: Actual garbage collection implementation
- **GCEnvironment**: GC root for variable environments

**Key Pattern**:

```cpp
// CORRECT (current implementation):
JSObject* obj = objectManager->createJSObject();  // GC tracks obj
Value val(obj);   // Value holds raw pointer, GC owns object

// WRONG (old broken pattern):
std::shared_ptr<JSObject> obj = std::make_shared<JSObject>();
Value val(obj);  // Mixed ownership causes leaks
```

### Built-in System (`src/builtins/`)

Each built-in module (Array, String, Math, etc.) follows this pattern:

- Static factory methods using `ObjectFactory*`
- Raw pointer returns (GC-managed)
- Prototype chain setup via `BuiltinManager`

### Exception Handling

- Custom `JavaScriptException` for throw statements
- `ReturnException` for early function returns
- GC-safe exception handling with deferred collection

## 📋 Development Workflow

### 1. Making Changes

```bash
# Build and test
./build.sh
npm test

# Check code quality
cd build && make quality
```

### 2. Testing Specific Features

```bash
# Test specific built-ins
./build/rift test/array-comprehensive-test.js
./build/rift test/object-keys-values-test.js

# Test error handling
./build/rift test/error-comprehensive-test.js

# Test garbage collection
./build/rift test/gc-basic-test.js
```

### 3. Test262 Development

```bash
# Quick subset testing
node test262-runner.js --include="language/expressions"

# Focus on specific areas
node test262-runner.js --include="built-ins/Array"
```

## 🐛 Common Development Issues

### 1. Build Failures

- Ensure C++23 support: `cmake .. -DCMAKE_CXX_STANDARD=23`
- Clean build: `rm -rf build && ./build.sh`

### 2. Segmentation Faults

- Often GC-related during shutdown
- Check `docs/gc-implementation-plan.md` for details
- Most runtime functionality works despite cleanup crashes

### 3. Test262 Failures

- Many failures expected (hobby project scope)
- Focus on specific language features
- Check `docs/TEST262_BLOCKERS.md` for known issues

### 4. Memory Issues

- Use sanitizers: `cmake .. -DENABLE_SANITIZERS=ON`
- Check GC debug output: Uncomment `#define DEBUG_GC` in CMakeLists.txt

## 📚 Key Documentation

- `README.md` - Project overview and features
- `docs/gc-implementation-plan.md` - Garbage collection architecture
- `docs/CI_TEST262_GUIDE.md` - Test262 CI system usage
- `docs/CODE_QUALITY.md` - Development tools and workflow
- `docs/TEST262_BLOCKERS.md` - Known compatibility issues

## 🎯 Current Status & Goals

### ✅ Completed

- Core JavaScript language features (variables, functions, objects, arrays)
- Control flow (if/else, while, for, try/catch)
- Built-in objects (Array, String, Math, Object, Console, Boolean, Error)
- Memory management with mark-sweep GC
- Exception handling system
- Comprehensive test infrastructure

### 🔧 Areas for Improvement

- Template literals (parsing implemented, evaluation pending)
- `this` binding edge cases
- ES6+ features (const/let, arrow functions, classes)
- Performance optimizations
- Error message quality

### 📊 Test262 Compatibility

- Current estimated: **40-60%** (significant progress from initial implementation)
- Focus areas: Built-ins, basic language constructs
- Known gaps: Modern syntax, advanced features

## 🚀 Getting Started for New Contributors

1. **Initial Setup**:

   ```bash
   git clone <repo-url>
   cd rift
   ./build.sh
   npm install
   ```

2. **Verify Installation**:

   ```bash
   ./build/rift -e "console.log('Rift is working!');"
   npm test
   ```

3. **Explore the Codebase**:

   - Start with `src/main.cpp` for entry point
   - Look at `src/api/api.cpp` for public interface
   - Check `src/core/engine/engine.cpp` for main execution logic
   - Explore `src/builtins/` for JavaScript built-ins

4. **Make Your First Change**:
   - Add a simple test in `test/`
   - Try implementing a missing string method
   - Fix a failing Test262 test

The codebase is well-structured and designed for learning. The garbage collection system is particularly noteworthy as a correct implementation of mark-sweep GC in a hobby JavaScript engine.
