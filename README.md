# Rift - A JavaScript Runtime in C++

A JavaScript runtime implementation written in C++ with test262 integration for ECMAScript compliance testing.

## Building and Running

### Prerequisites

- C++17 compatible compiler (GCC, Clang, or MSVC)
- CMake 3.16 or higher
- Node.js 14+ (for test262 runner)
- Git (for cloning test262)

### Build the Runtime

```bash
# Make build script executable (if not already)
chmod +x build.sh

# Build the project
./build.sh
```

This will create the `rift` executable in the `build/` directory.

### Run JavaScript Code

```bash
# Execute a JavaScript file
./build/rift test/test-file.js

# Execute JavaScript code directly
./build/rift -e "2 + 3 * 4"
```

### Run Test262 Tests

The project includes integration with the official ECMAScript test suite (test262):

```bash
npm run test
```

The test runner will:

1. Clone the test262 repository (if not already present)
2. Build the runtime
3. Run a subset of basic tests
4. Show a summary of passed/failed/skipped tests

## Implementation Status

### ✅ Implemented

- **Global Functions**: `parseInt`, `parseFloat`, `isNaN`, `isFinite`
- **Console**: `log`, `error`, `warn`, `info`
- **String**: `charAt`, `indexOf`, `slice`, `toLowerCase`, `toUpperCase`, `trim`, `split`, etc.
- **Math**: `abs`, `ceil`, `floor`, `max`, `min`, `pow`, `sqrt`, `random`, `sin`, `cos`, etc.

### ❌ Not Yet Implemented

- **Array**: `push`, `pop`, `map`, `filter`, `reduce`, `forEach`, etc.
- **Object**: `keys`, `values`, `entries`, `assign`, etc.
- **Function**: `call`, `apply`, `bind`
- **Date**, **JSON**, **RegExp**, **Error types**, **Promises**

## Architecture

The runtime follows a traditional interpreter architecture:

1. **Lexer** (`parser.cpp`): Tokenizes JavaScript source code
2. **Parser** (`parser.cpp`): Builds an Abstract Syntax Tree (AST)
3. **Evaluator** (`evaluator.cpp`): Walks the AST and executes the code
4. **Runtime** (`runtime.cpp`): Manages the execution environment and values

## Test262 Integration

The project includes a Node.js script that runs the official ECMAScript test suite against our runtime. This helps ensure compliance with the JavaScript specification.

The test runner:

- Automatically clones the test262 repository
- Filters tests to focus on supported features
- Runs tests against the compiled runtime
- Provides detailed pass/fail statistics

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [test262](https://github.com/tc39/test262) - ECMAScript Test Suite
- ECMAScript specification for language semantics
