# JSRuntime - Minimal JavaScript Runtime in C++

A minimal JavaScript runtime implementation written in C++ with test262 integration for ECMAScript compliance testing.

## Features

This is a **minimal** JavaScript runtime that currently supports:

- ✅ Basic arithmetic operations (`+`, `-`, `*`, `/`)
- ✅ Number and string literals
- ✅ Boolean literals (`true`, `false`)
- ✅ Variable declarations with `var`
- ✅ Basic expression evaluation
- ✅ String concatenation with `+` operator
- ✅ Type coercion for arithmetic operations

## What's NOT Supported (Yet)

This is a minimal implementation, so many JavaScript features are not yet implemented:

- ❌ Functions and function calls
- ❌ Objects and object properties
- ❌ Arrays
- ❌ Control flow (`if`, `for`, `while`)
- ❌ Scoping beyond global scope
- ❌ `let` and `const` declarations
- ❌ Most built-in objects and methods
- ❌ Error handling (`try`/`catch`)
- ❌ And much more...

## Project Structure

```
├── CMakeLists.txt          # CMake build configuration
├── build.sh               # Build script
├── test262-runner.js      # Test262 integration script
├── package.json           # Node.js package configuration
├── include/               # Header files
│   ├── runtime.h          # Core runtime classes
│   ├── parser.h           # Lexer and parser
│   └── evaluator.h        # AST evaluator
├── src/                   # Source files
│   ├── main.cpp           # Main executable
│   ├── runtime.cpp        # Runtime implementation
│   ├── parser.cpp         # Lexer and parser implementation
│   └── evaluator.cpp      # Evaluator implementation
└── examples/              # Example JavaScript files
    └── simple.js          # Basic examples
```

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

This will create the `jsruntime` executable in the `build/` directory.

### Run JavaScript Code

```bash
# Execute a JavaScript file
./build/jsruntime examples/simple.js

# Execute JavaScript code directly
./build/jsruntime -e "2 + 3 * 4"

# Show help
./build/jsruntime --help
```

### Run Test262 Tests

The project includes integration with the official ECMAScript test suite (test262):

```bash
# Run test262 tests (will clone test262 repo if needed)
node test262-runner.js

# Or using npm scripts
npm test

# Run a smaller subset for quick testing
npm run test:quick
```

The test runner will:

1. Clone the test262 repository (if not already present)
2. Build the runtime
3. Run a subset of basic tests
4. Show a summary of passed/failed/skipped tests

## Example Usage

```javascript
// examples/simple.js
2 + 3; // Returns: 5

var x = 10;
var y = 5;
x + y * 2; // Returns: 20

"Hello" + " " + "World"; // Returns: "Hello World"

var message = "The answer is: ";
var answer = 42;
message + answer; // Returns: "The answer is: 42"
```

## Architecture

The runtime follows a traditional interpreter architecture:

1. **Lexer** (`parser.cpp`): Tokenizes JavaScript source code
2. **Parser** (`parser.cpp`): Builds an Abstract Syntax Tree (AST)
3. **Evaluator** (`evaluator.cpp`): Walks the AST and executes the code
4. **Runtime** (`runtime.cpp`): Manages the execution environment and values

### Key Classes

- `Value`: Represents JavaScript values (numbers, strings, booleans, etc.)
- `Environment`: Manages variable scoping and storage
- `Lexer`: Converts source code into tokens
- `Parser`: Converts tokens into an AST
- `Evaluator`: Executes the AST
- `Runtime`: Main runtime coordinator

## Test262 Integration

The project includes a Node.js script that runs the official ECMAScript test suite against our runtime. This helps ensure compliance with the JavaScript specification.

The test runner:

- Automatically clones the test262 repository
- Filters tests to focus on supported features
- Runs tests against the compiled runtime
- Provides detailed pass/fail statistics

Most tests will fail initially since this is a minimal implementation, but you can track progress as you add more features.

## Development

### Adding New Features

1. Add token types to `TokenType` enum in `parser.h`
2. Update the lexer in `parser.cpp` to recognize new syntax
3. Add AST node types to `ASTNodeType` enum in `parser.h`
4. Update the parser to handle new syntax constructs
5. Add evaluation logic in `evaluator.cpp`
6. Test with simple examples and test262

### Building

```bash
# Clean build
npm run clean
npm run build

# Or manually
rm -rf build
mkdir build && cd build
cmake ..
make
```

## Contributing

This is a minimal educational runtime. Areas for improvement:

1. **More operators**: Comparison operators, logical operators
2. **Control flow**: `if`/`else`, loops
3. **Functions**: Function declarations and calls
4. **Objects**: Object literals, property access
5. **Arrays**: Array literals and methods
6. **Error handling**: Better error messages and recovery
7. **Performance**: Optimizations for the interpreter

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [test262](https://github.com/tc39/test262) - ECMAScript Test Suite
- ECMAScript specification for language semantics
