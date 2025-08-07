# Rift - A JavaScript Runtime in C++

A JavaScript runtime implementation written in C++ with robust garbage collection and a growing subset of JavaScript language support.

## Features

✅ **Fully functional garbage collection** with mark-sweep algorithm  
✅ **Memory-safe execution** with proper object lifecycle management  
✅ **Core JavaScript subset** including closures, prototypes, and exception handling  
✅ **Rich built-in object library** with Array, String, Math, Object, and more  
✅ **Test262 integration** for ECMAScript compliance testing  

## Building and Running

### Prerequisites

- C++17 compatible compiler (GCC, Clang, or MSVC)
- CMake 3.16 or higher
- Node.js 14+ (for test262 runner)
- Git (for cloning test262)

### Code Quality Tools (Optional but Recommended)

- **clang-format**: Code formatting
- **cppcheck**: Static analysis

**Installation**:
```bash
# macOS
brew install clang-format cppcheck

# Ubuntu/Debian
apt-get install clang-format cppcheck
```

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
./build/rift -e "console.log('Hello, World!')"
./build/rift -e "var arr = [1, 2, 3]; arr.push(4); console.log(arr.length);"
```

### Run Test262 Tests

The project includes integration with the official ECMAScript test suite (test262):

```bash
npm run test
```

### Code Quality

This project uses comprehensive code quality tools to ensure safe and maintainable code:

### Available Make Targets

```bash
# Code formatting
make format          # Auto-format all source files
make format-check    # Check formatting (used in CI)

# Static analysis
make cppcheck        # Run cppcheck static analysis

# All quality checks
make quality         # Run format-check + cppcheck
```

### GitHub Actions CI

All pull requests automatically run:
- **Code formatting check** - Ensures consistent style
- **Static analysis** - Catches potential bugs with cppcheck
- **Multi-compiler builds** - Tests with both GCC and Clang
- **Sanitizer builds** - Runtime error detection with AddressSanitizer/UBSan

### For Contributors

Before submitting a PR:
1. Run `make format` to auto-format your code
2. Run `make quality` to check for issues
3. Ensure your code builds: `make -j4`

The CI will automatically verify all quality checks on your PR.

**Common Commands**: `make format`, `make cppcheck`, `make quality`

## Implementation Status

### ✅ Supported Today

- **Data types**
  - ✅ Primitives: `undefined`, `null`, `boolean`, `number`, `string`
  - ✅ Objects: Object literals, arrays, functions

- **Expressions**
  - ✅ Literals: string, number, boolean, null, undefined, object, array
  - ✅ Identifiers: variable access with lexical environments
  - ✅ Operators:
    - Arithmetic: `+`, `-`, `*`, `/`, `%`
    - Comparison: `<`, `>`, `<=`, `>=`, `==`, `!=`, `===`, `!==`
    - Logical: `&&`, `||` with short-circuiting, unary `!`
    - Unary: `+`, `-`, `~`, `typeof`
    - Update: prefix/postfix `++`, `--` on identifiers and member expressions
  - ✅ Member access: dot (`obj.prop`) and computed (`obj[expr]`)
  - ✅ Function calls: invocation with arguments
  - ✅ Assignment: variable and property assignment
  - ✅ Object construction: `new` operator
  - ✅ Template literals: basic support including `${expr}` interpolation

- **Statements**
  - ✅ Variable declarations: `var` (block-scoped `let`/`const` not yet)
  - ✅ Control flow: `if`/`else`, `while`, C-style `for (init; cond; update)`
  - ✅ `switch`/`case`/`default` with `break`
  - ✅ `break` and `continue` in loops
  - ✅ Functions: declarations and expressions
  - ✅ `return`
  - ✅ Exceptions: `throw`, `try`/`catch`/`finally`

- **Runtime semantics**
  - ✅ Closures: lexical capture of outer variables
  - ✅ Prototype chain: constructor `prototype` objects and prototype lookups
  - ✅ Garbage collection: mark-sweep with root management

### ✅ **Built-in Objects**

#### **Global Functions**
- ✅ `parseInt(string, radix)`
- ✅ `parseFloat(string)`
- ✅ `isNaN(value)`
- ✅ `isFinite(value)`
- ✅ Global constants: `undefined`, `NaN`, `Infinity`

#### **Console Object**
- ✅ `console.log(...args)`
- ✅ `console.error(...args)`
- ✅ `console.warn(...args)`
- ✅ `console.info(...args)`

#### **Array Constructor & Methods**
- ✅ `Array()` and `new Array()`
- ✅ `Array.isArray(value)`
- ✅ `array.length`
- ✅ `array.push(...items)`, `array.pop()`
- ✅ `array.forEach(fn)`, `array.map(fn)`, `array.filter(fn)`, `array.reduce(fn, initial)`
- ✅ `array.indexOf(x)`, `array.includes(x)`
- ✅ `array.slice(start, end)`, `array.concat(...items)`
- ✅ `array.toString()`

#### **String Constructor & Methods**
- ✅ `String()`
- ✅ `string.charAt`, `string.charCodeAt`, `string.concat`
- ✅ `string.indexOf`, `string.lastIndexOf`
- ✅ `string.slice`, `string.split`, `string.substring`
- ✅ `string.toLowerCase`, `string.toUpperCase`, `string.trim`
- ✅ `string.toString`, `string.valueOf`

#### **Math Object**
- ✅ Constants: `Math.PI`, `Math.E`, `Math.LN2`, `Math.LN10`, `Math.LOG2E`, `Math.LOG10E`, `Math.SQRT2`, `Math.SQRT1_2`
- ✅ Functions: `abs`, `floor`, `ceil`, `round`, `max`, `min`, `pow`, `sqrt`, `random`, `sign`, `trunc`, `sin`, `cos`, `tan`

#### **Object Constructor & Methods**
- ✅ `Object()`
- ✅ `Object.keys`, `Object.values`, `Object.entries`
- ✅ `object.hasOwnProperty`, `object.toString`, `object.valueOf`

#### **Boolean Constructor & Methods**
- ✅ `Boolean()`
- ✅ `boolean.toString`, `boolean.valueOf`

#### **Error Constructor & Methods**
- ✅ `Error()`
- ✅ `error.toString`

### ❌ Not Yet Implemented

- **Language constructs**
  - ❌ Block-scoped declarations: `let`, `const`
  - ❌ Arrow functions `() => {}`
  - ❌ Destructuring, spread (`...`), rest parameters
  - ❌ Classes (`class`, `extends`, `super`)
  - ❌ Modules (`import`/`export`)
  - ❌ `for-in`, `for-of`
  - ❌ Optional chaining `?.`, nullish coalescing `??`
  - ❌ Exponentiation `**`
  - ❌ Bitwise binary operators: `&`, `|`, `^`, `<<`, `>>`, `>>>`

- **Built-in objects/APIs**
  - ❌ Date, JSON, RegExp
  - ❌ Promise/Async (`async`/`await`), timers/event loop
  - ❌ Set/Map, Symbol, Proxy
  - ❌ Function.prototype methods: `call`, `apply`, `bind`

### ℹ️ Notes & Limitations

- `this` binding in user-defined functions is limited: builtin methods receive the receiver as the first argument, but `this` inside user functions is currently not set from method calls.
- Only `var` is supported; there is no block scope semantics yet.

## Architecture

The runtime follows a modern interpreter architecture with robust memory management:

1. **Frontend**
   - **Lexer**: Tokenizes JavaScript source code
   - **Parser**: Builds an Abstract Syntax Tree (AST)

2. **Core Engine**
   - **Expression Evaluator**: Handles expressions (literals, operators, function calls)
   - **Statement Evaluator**: Handles statements (control flow, declarations)
   - **Operation Handler**: Implements JavaScript operators

3. **Runtime System**
   - **Value System**: Type-safe value representation
   - **Environment**: Variable scope and binding management
   - **Memory Management**: Mark-sweep garbage collector

4. **Built-in Library**
   - **Object Factory**: GC-managed object creation
   - **Built-in Objects**: Comprehensive standard library implementation

## Memory Management

Rift features a **production-quality garbage collector**:

- ✅ **Mark-sweep algorithm** with proper cycle detection
- ✅ **Automatic memory management** - no manual memory handling required
- ✅ **Exception-safe collection** - GC defers during exception handling
- ✅ **Root set management** - proper handling of stack references
- ✅ **Clean shutdown** - safe program termination without crashes

## Test262 Integration

The project includes a Node.js script that runs the official ECMAScript test suite against our runtime:

```bash
npm run test
```

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
# Testing CI formatting
