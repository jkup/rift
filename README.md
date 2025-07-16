# Rift - A JavaScript Runtime in C++

A JavaScript runtime implementation written in C++ with robust garbage collection and comprehensive JavaScript language support.

## Features

✅ **Fully functional garbage collection** with mark-sweep algorithm  
✅ **Memory-safe execution** with proper object lifecycle management  
✅ **Comprehensive JavaScript language support** including closures, prototypes, and exception handling  
✅ **Rich built-in object library** with Array, String, Math, Object, and more  
✅ **Test262 integration** for ECMAScript compliance testing  

## Building and Running

### Prerequisites

- C++17 compatible compiler (GCC, Clang, or MSVC)
- CMake 3.16 or higher
- Node.js 14+ (for test262 runner)
- Git (for cloning test262)

### Code Quality Tools

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

### ✅ **Language Constructs**

#### **Data Types**
- ✅ **Primitives**: `undefined`, `null`, `boolean`, `number`, `string`
- ✅ **Objects**: Object literals, arrays, functions
- ✅ **Type system**: Proper type checking and conversion

#### **Expressions**
- ✅ **Literals**: String, number, boolean, null, undefined, object, array
- ✅ **Identifiers**: Variable access and scoping
- ✅ **Operators**: Arithmetic (`+`, `-`, `*`, `/`), comparison (`<`, `>`, `<=`, `>=`, `==`, `!=`, `===`, `!==`), logical (`!`), unary (`+`, `-`, `~`, `typeof`)
- ✅ **Member access**: Dot notation (`obj.prop`) and bracket notation (`obj['prop']`)
- ✅ **Function calls**: Function invocation with arguments
- ✅ **Assignment**: Variable assignment and property assignment
- ✅ **Object construction**: `new` operator

#### **Statements**
- ✅ **Variable declarations**: `var` statements
- ✅ **Control flow**: `if`/`else` statements, `while` loops
- ✅ **Functions**: Function declarations and expressions
- ✅ **Exception handling**: `try`/`catch`/`throw` statements
- ✅ **Return statements**: Early function returns

#### **Advanced Features**
- ✅ **Closures**: Lexical scoping and captured variables
- ✅ **Prototype chains**: Object inheritance and prototype lookups
- ✅ **Exception handling**: Proper error propagation and catching
- ✅ **Garbage collection**: Automatic memory management with cycle detection

### ✅ **Built-in Objects**

#### **Global Functions**
- ✅ `parseInt(string, radix)` - Parse integers
- ✅ `parseFloat(string)` - Parse floating-point numbers
- ✅ `isNaN(value)` - Check for NaN
- ✅ `isFinite(value)` - Check for finite numbers
- ✅ Global constants: `undefined`, `NaN`, `Infinity`

#### **Console Object**
- ✅ `console.log(...args)` - Log messages
- ✅ `console.error(...args)` - Log error messages  
- ✅ `console.warn(...args)` - Log warning messages
- ✅ `console.info(...args)` - Log info messages

#### **Array Constructor & Methods**
- ✅ `Array()` constructor and `new Array()`
- ✅ `Array.isArray(value)` - Check if value is array
- ✅ `array.push(...items)` - Add elements to end
- ✅ `array.pop()` - Remove last element
- ✅ `array.length` - Array length property
- ✅ `array.forEach(callback)` - Iterate over elements
- ✅ `array.map(callback)` - Transform elements
- ✅ `array.filter(callback)` - Filter elements
- ✅ `array.reduce(callback, initial)` - Reduce to single value
- ✅ `array.indexOf(searchElement)` - Find element index
- ✅ `array.includes(searchElement)` - Check element presence
- ✅ `array.slice(start, end)` - Extract array portion
- ✅ `array.concat(...arrays)` - Concatenate arrays
- ✅ `array.toString()` - Convert to string

#### **String Constructor & Methods**
- ✅ `String()` constructor
- ✅ `string.charAt(index)` - Get character at index
- ✅ `string.charCodeAt(index)` - Get character code
- ✅ `string.concat(...strings)` - Concatenate strings
- ✅ `string.indexOf(searchString)` - Find substring
- ✅ `string.lastIndexOf(searchString)` - Find last occurrence
- ✅ `string.slice(start, end)` - Extract substring
- ✅ `string.split(separator)` - Split into array
- ✅ `string.substring(start, end)` - Extract substring
- ✅ `string.toLowerCase()` - Convert to lowercase
- ✅ `string.toUpperCase()` - Convert to uppercase
- ✅ `string.trim()` - Remove whitespace
- ✅ `string.toString()` - Convert to string
- ✅ `string.valueOf()` - Get primitive value

#### **Math Object**
- ✅ Mathematical functions: `abs`, `floor`, `ceil`, `round`, `max`, `min`, `pow`, `sqrt`, `random`, `sign`, `trunc`
- ✅ Trigonometric functions: `sin`, `cos`, `tan`
- ✅ Mathematical constants: `Math.PI`, `Math.E`, `Math.LN2`, `Math.LN10`, etc.

#### **Object Constructor & Methods**
- ✅ `Object()` constructor
- ✅ `Object.keys(obj)` - Get object keys
- ✅ `Object.values(obj)` - Get object values  
- ✅ `Object.entries(obj)` - Get key-value pairs
- ✅ `object.toString()` - Convert to string
- ✅ `object.valueOf()` - Get primitive value
- ✅ `object.hasOwnProperty(prop)` - Check own property

#### **Boolean Constructor & Methods**
- ✅ `Boolean()` constructor
- ✅ `boolean.toString()` - Convert to string
- ✅ `boolean.valueOf()` - Get primitive value

#### **Error Constructor & Methods**
- ✅ `Error()` constructor
- ✅ `error.toString()` - Convert to string

### ❌ **Not Yet Implemented**

#### **Language Constructs**
- ❌ **For loops**: `for`, `for-in`, `for-of` statements
- ❌ **Switch statements**: `switch`/`case`/`default`
- ❌ **Arrow functions**: `() => {}` syntax
- ❌ **Template literals**: `` `string ${expr}` ``
- ❌ **Destructuring**: Array and object destructuring
- ❌ **Spread operator**: `...` for arrays and objects
- ❌ **Rest parameters**: `function(...args)`
- ❌ **Classes**: `class`, `extends`, `super`
- ❌ **Modules**: `import`/`export` statements

#### **Built-in Objects**
- ❌ **Date**: Date constructor and methods
- ❌ **JSON**: `JSON.parse`, `JSON.stringify`
- ❌ **RegExp**: Regular expression support
- ❌ **Promise**: Asynchronous programming
- ❌ **Set/Map**: Collection objects
- ❌ **Symbol**: Symbol primitive type
- ❌ **Proxy**: Meta-programming features

#### **Advanced Array Methods**
- ❌ `array.some(callback)` - Test if some elements pass test
- ❌ `array.every(callback)` - Test if all elements pass test  
- ❌ `array.find(callback)` - Find first matching element
- ❌ `array.findIndex(callback)` - Find first matching index

#### **Function Methods**
- ❌ `function.call(thisArg, ...args)` - Call with specific `this`
- ❌ `function.apply(thisArg, argsArray)` - Apply with arguments array
- ❌ `function.bind(thisArg, ...args)` - Create bound function

#### **Async Features**
- ❌ `async`/`await` syntax
- ❌ Promise-based APIs
- ❌ Event loops and timers

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
# CI Formatting Test
