# CLAUDE.md - Essential Guide for Working on Rift JavaScript Runtime

## Quick Reference

| Task                       | Command / Location                                                      |
| -------------------------- | ----------------------------------------------------------------------- |
| Build (recommended)        | `./build.sh`                                                            |
| Manual build               | `mkdir -p build && cd build && cmake .. && make -j$(sysctl -n hw.ncpu)` |
| Run JS file                | `./build/rift path/to/script.js`                                        |
| Run JS code (inline)       | `./build/rift -e "console.log('hi')"`                                   |
| Run custom tests           | `npm test` or `node test-runner.js`                                     |
| Run Test262 suite          | `npm run test262` or `node test262-runner.js`                           |
| Run Test262 group          | `npm run test262:group -- <group-name>`                                 |
| List Test262 groups        | `npm run test262:groups`                                                |
| Analyze Test262 impact     | `npm run test262:analyze`                                               |
| Find Test262 regressions   | `npm run test262:diff` or `node test262-diff.js`                        |
| Run specific Test262 test  | `node test262-runner.js path/to/test.js`                                |
| Format code                | `cd build && make format`                                               |
| Check formatting           | `cd build && make format-check`                                         |
| Static analysis            | `cd build && make cppcheck`                                             |
| All code quality checks    | `cd build && make quality`                                              |

---

## Project Overview

**Rift** is a JavaScript runtime written in C++ with garbage collection and comprehensive JavaScript language support. Key features:

- Mark-sweep garbage collection with memory-safe execution
- Comprehensive JavaScript language support including closures, prototypes, exception handling
- Rich built-in object library (Array, String, Math, Object, Console, Boolean, Number, Error, JSON, RegExp)
- Test262 integration for ECMAScript compliance testing
- Modern C++23 architecture

---

## Project Structure

```
rift/
├── src/                          # Core C++ implementation
│   ├── main.cpp                  # Entry point
│   ├── api/                      # Public JavaScript API
│   ├── core/engine/              # Main execution engine
│   │   ├── engine.cpp            # Core Rift engine
│   │   ├── expression_evaluator.cpp
│   │   ├── statement_evaluator.cpp
│   │   ├── operation_handler.cpp
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
│   │   ├── gc_environment.cpp    # GC root for environments
│   │   ├── gc_protector.cpp      # RAII GC protection
│   │   └── gc_disabler.cpp       # Temporary GC disable
│   └── builtins/                 # JavaScript built-in objects
│       ├── console/, math/, global/, array/
│       ├── string/, object/, boolean/, number/
│       ├── json/, regexp/
│       └── error/                # Error, TypeError, ReferenceError, etc.
├── include/rift/                 # Header files (mirrors src/)
├── test/                         # Custom test suite (~145 test files)
├── test262/                      # Official ECMAScript test suite
├── build/                        # Build output directory
├── cmake/                        # CMake modules (CodeQuality.cmake)
├── docs/                         # Documentation
├── build.sh                      # Main build script
├── CMakeLists.txt                # Build configuration
├── package.json                  # Node.js dependencies for test runners
├── test-runner.js                # Custom test runner
└── test262-runner.js             # Test262 compliance runner
```

---

## Working Preferences

### TODO List Management
When completing tasks from TODO.md, **remove finished items entirely** rather than marking them as "DONE", crossing them out with strikethrough, or adding checkmarks. Keep the TODO list clean and focused on remaining work.

---

## Code Style & Best Practices

### Naming Conventions
- Classes: `PascalCase`
- Functions: `camelCase`
- Variables: `snake_case`
- Constants: `UPPER_CASE`
- Private members: `trailing_underscore_`

### Structure Guidelines
- Max 100 lines per function, 50 statements per function
- Clear separation of concerns
- Use `auto` where appropriate, prefer `constexpr`
- Use range-based for loops
- Avoid raw pointers unless GC-managed

### ECMAScript Compliance
All features must follow ECMAScript specification. Reference https://262.ecma-international.org/16.0/ for official behavior.

### Exception Handling
- **NEVER use `catch(...)`** - it swallows ALL exceptions including system errors
- Always catch specific exception types: `catch(const std::exception& e)` or `catch(const std::invalid_argument&)`
- For `std::stod()`, `std::stoi()`, etc., catch `std::invalid_argument` and `std::out_of_range`
- Include `#include <iostream>` when using `std::cerr`
- Include `#include <limits>` when using `std::numeric_limits`

### Type Safety with dynamic_cast
**ALWAYS check `dynamic_cast` results for nullptr before use:**

```cpp
auto* funcPtr = dynamic_cast<JSFunction*>(value.getObject());
if (!funcPtr) {
    throw JavaScriptException(Value("TypeError: expected function"));
}
// Now safe to use funcPtr
```

For ECMAScript compliance, throw `TypeError` when type check fails. Include `#include "rift/core/engine/javascript_exception.h"`.

### Memory Management & GC

**NEVER use raw `new` for JavaScript objects - always use `ObjectFactory`:**

```cpp
// CORRECT:
auto* obj = factory->createJSObject();
// or
engine->getObjectFactory()->createJSObject();

// WRONG (not tracked by GC, will leak):
auto* obj = new JSObject();
```

**GC Protection During Initialization - use `GCProtector` for complex constructors:**

```cpp
#include "rift/memory/gc_protector.h"

auto* obj = getObjectFactory()->createJSObject(prototype);
GCProtector protect(obj, getObjectFactory()->getObjectManager());

// Safe to initialize properties
obj->setProperty("length", Value(0.0));
// ... more initialization ...

return Value(obj);  // GCProtector destructor removes temporary root
```

**When creating many objects in a loop, temporarily disable GC:**

```cpp
auto* objManager = factory->getObjectManager();
bool wasGCEnabled = objManager->isGCEnabled();
objManager->setGCEnabled(false);
try {
    // Create many objects safely
    objManager->setGCEnabled(wasGCEnabled);
} catch(const std::exception& e) {
    objManager->setGCEnabled(wasGCEnabled);
    throw;
}
```

### Formatting
- Use `make format` before committing
- 4-space indent, 100-char line limit
- Address all `clang-tidy` and `cppcheck` warnings

---

## Build System

### Requirements
- **C++23** compatible compiler (GCC/Clang)
- **CMake 3.16+**
- **Node.js 14+** (for test runners)

### Build Commands

```bash
# Recommended
./build.sh

# Manual
mkdir -p build && cd build
cmake ..
make -j$(sysctl -n hw.ncpu)  # macOS
make -j$(nproc)              # Linux
```

### Sanitizers
```bash
cmake .. -DENABLE_SANITIZERS=ON
```

### GC Debug Output
Uncomment in CMakeLists.txt:
```cmake
target_compile_definitions(rift PRIVATE DEBUG_GC)
```

---

## Testing

### Custom Test Suite
```bash
npm test
# or
node test-runner.js
```

### Test262 Compliance
```bash
npm run test262                    # Full suite
node test262-runner.js             # Same as above

# Run specific patterns
node test262-runner.js --include="language/expressions/addition"

# Run single test
node test262-runner.js test/language/expressions/addition/S11.6.1_A3.1_T2.1.js
```

### Test262 Groups
```bash
npm run test262:groups             # List available groups
npm run test262:group -- <name>    # Run specific group
npm run test262:analyze            # Analyze impact
```

### Finding Test262 Regressions
When CI shows a regression (tests that used to pass now fail), use the diff tool to find which specific tests changed:
```bash
npm run test262:diff               # Compare current results to main branch
node test262-diff.js --verbose     # Show all changed tests (not truncated)
node test262-diff.js --json        # JSON output for CI integration

# Compare two specific result files
node test262-diff.js --baseline old-results.json --current new-results.json
```

**Note:** For the diff tool to work automatically, `test262-results.json` must be committed to the main branch. Otherwise, use `--baseline` to specify a baseline file.

---

## Architecture

### Core Engine (`src/core/engine/`)
- **Engine**: Main coordinator class
- **ExpressionEvaluator**: Handles expressions (literals, operators, calls)
- **StatementEvaluator**: Handles statements (control flow, declarations)
- **OperationHandler**: Arithmetic and comparison operations
- **BuiltinManager**: Sets up built-in objects and prototypes

### Memory Management (`src/memory/`)
Single-ownership GC model:
- **ObjectManager**: Central object lifecycle management
- **ObjectFactory**: GC-aware object creation
- **MarkSweepGC**: Garbage collection implementation
- **GCEnvironment**: GC root for variable environments
- **GCProtector**: RAII temporary root protection
- **GCDisabler**: Scoped GC disable utility

### Built-in System (`src/builtins/`)
Each built-in module follows this pattern:
- Static factory methods using `ObjectFactory*`
- Raw pointer returns (GC-managed)
- Prototype chain setup via `BuiltinManager`

Current built-ins: Array, Boolean, Console, Error (TypeError, ReferenceError, SyntaxError, RangeError), Global, JSON, Map, Math, Number, Object, RegExp, Set, String, Symbol, Iterator prototypes (Array/String/Set/Map iterators)

### Dependencies
- **RE2** (Google): Regular expression support via FetchContent
- **Abseil**: Required by RE2

---

## Adding a New Feature

1. **Plan**: Identify where the feature fits (built-in, parser, runtime)
2. **Implement**: Add code in the appropriate `src/` subfolder
3. **Update CMakeLists.txt**: Add new `.cpp` files to the appropriate `*_SOURCES` section (e.g., `BUILTINS_SOURCES`, `CORE_SOURCES`)
4. **Test**: Add tests in `test/` or relevant Test262 files
5. **Build**: Run `./build.sh` and ensure no errors
6. **Run tests**: `npm test` and/or `node test262-runner.js --include="<feature>"`
7. **Check quality**: `cd build && make quality`
8. **Commit**: Format code with `make format`, then commit

---

## Adding New Builtins

New built-in objects follow the `BuiltinBase<T>` CRTP pattern. Here's the complete process:

### 1. Create Header (`include/rift/builtins/<name>/<name>.h`)

```cpp
#pragma once
#include "rift/builtins/builtin_base.h"

namespace rift::builtins {

class MyBuiltin : public BuiltinBase<MyBuiltin> {
public:
    static JSObject* create(rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    // Prototype methods
    static Value myMethod(const CallContext& ctx, const std::vector<Value>& args);
};

}
```

### 2. Create Implementation (`src/builtins/<name>/<name>.cpp`)

Use the `RIFT_METHOD` and `RIFT_STATIC_METHOD` macros to register methods:

```cpp
#include "rift/builtins/<name>/<name>.h"

namespace rift::builtins {

void MyBuiltin::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "myMethod", MyBuiltin::myMethod);
    // For static methods on the constructor:
    // RIFT_STATIC_METHOD(constructor, "staticMethod", MyBuiltin::staticMethod);
}

Value MyBuiltin::myMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // Implementation
}

}
```

### 3. Register in BuiltinManager

In `src/core/engine/builtin_manager.cpp`:
- Add `#include` for your header
- Add `setup<Name>()` method
- Call it from `setupBuiltins()` (order matters if your builtin depends on others)
- If it has a prototype, add static pointer and accessor like other builtins

### 4. Symbol-keyed Properties

For well-known symbols like `[Symbol.iterator]`:

```cpp
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/evaluation_utils.h"

// In setupPrototypeMethods:
std::string key = core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
auto* func = factory->createJSFunction(MyBuiltin::symbolIterator);
prototype->setProperty(key, Value(func));
```

### 5. Iterator Types

Iterator builtins should:
- Have a static `prototype_` member initialized via `setupPrototype(factory, iteratorPrototype)`
- Inherit from `%IteratorPrototype%` (passed from BuiltinManager)
- Store iteration state as internal properties (e.g., `[[IteratedArray]]`, `[[NextIndex]]`)
- Implement `next()` returning `{done: bool, value: any}`

---

## Debugging & Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Ensure C++23 support, clean build: `rm -rf build && ./build.sh` |
| Segfaults | Often GC-related during shutdown; runtime usually works |
| Test262 failures | Many expected; focus on specific features |
| Memory issues | Use sanitizers: `cmake .. -DENABLE_SANITIZERS=ON` |
| Formatting issues | Run `make format`, then `make format-check` |
| Node/npm issues | Use Node.js 14+; run `npm install` after cloning |
| Computed property syntax | `{[Symbol.iterator]: fn}` not supported; use `obj[Symbol.iterator] = fn` instead |

---

## Documentation

- `docs/CODE_QUALITY.md` - Development tools and workflow
- `docs/CI_TEST262_GUIDE.md` - Test262 CI system usage
- `docs/TEST262_GROUPS_GUIDE.md` - Test262 group testing
- `docs/TEST262_IMPACT_ANALYSIS.md` - Impact analysis guide
- `docs/TEST262_IMPROVEMENT_IDEAS.md` - Future improvements
- `docs/PROPERTY_STORAGE.md` - Property storage implementation
- `docs/TECH_DEBT.md` - Known technical debt

---

## Getting Started

```bash
# Clone and build
git clone <repo-url>
cd rift
./build.sh
npm install

# Verify installation
./build/rift -e "console.log('Rift is working!');"
npm test

# Explore
# Entry point: src/main.cpp
# Public API: src/api/api.cpp
# Core engine: src/core/engine/engine.cpp
# Built-ins: src/builtins/
```
