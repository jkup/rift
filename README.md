# Rift - A JavaScript Runtime in C++

A JavaScript runtime implementation written in C++ with robust garbage collection and a growing subset of JavaScript language support.

## Features

✅ **Fully functional garbage collection** with mark-sweep algorithm  
✅ **Memory-safe execution** with proper object lifecycle management  
✅ **Core JavaScript subset** including closures, prototypes, and exception handling (try/catch/finally)  
✅ **Rich built-in object library** with Array, String, Math, Object, Symbol, RegExp and more  
✅ **RegExp support** via [Google RE2](https://github.com/google/re2) for safe, linear-time pattern matching  
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

### Run Tests

The project includes comprehensive testing capabilities:

```bash
# Run the curated JS test suite
npm run test

# Run a single test file
./build/rift test/let-const-parser-test.js

# Test262 (ECMAScript compliance testing)
npm run test262              # Run full Test262 suite (30-45 min)
npm run test262:groups       # List available test groups
npm run test262:group -- basic-types        # Run specific group (~20s)
npm run test262:group -- built-in-array     # Test Array implementation
npm run test262:all-groups   # Run all groups with summary
```

**New!** Category-based testing for faster feedback:
- Run specific feature groups instead of the full suite
- Get detailed breakdowns by category (built-ins, language features, etc.)
- See which areas are strongest vs need improvement

See [`docs/TEST262_GROUPS_GUIDE.md`](docs/TEST262_GROUPS_GUIDE.md) for detailed usage.

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
    - Arithmetic: `+`, `-`, `*`, `/`, `%`, `**` (exponentiation)
    - Comparison: `<`, `>`, `<=`, `>=`, `==`, `!=`, `===`, `!==`
    - Logical: `&&`, `||` with short-circuiting, unary `!`
    - Bitwise: `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`
    - Unary: `+`, `-`, `~`, `typeof`
    - Update: prefix/postfix `++`, `--` on identifiers and member expressions
    - Compound assignment: `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`
  - ✅ Member access: dot (`obj.prop`) and computed (`obj[expr]`)
  - ✅ Function calls: invocation with arguments and correct `this` binding for method calls
  - ✅ Assignment: variable and property assignment
  - ✅ Object construction: `new` operator with proper constructor `this` context
  - ✅ Template literals: basic support including `${expr}` interpolation

- **Statements**
  - ✅ Variable declarations: `var`, `let`, `const` with proper block scoping and TDZ
  - ✅ Control flow: `if`/`else`, `while`, `do-while`, C-style `for (init; cond; update)`, `for-in`, `for-of`
  - ✅ `switch`/`case`/`default` with `break`
  - ✅ `break` and `continue` in loops
  - ✅ Functions: declarations and expressions
  - ✅ `return`
  - ✅ Exceptions: `throw`, `try`/`catch`/`finally`

- **ES6+ Features** ✅ **NEW**
  - ✅ Arrow functions: `() => expr`, `(a, b) => { ... }`, `x => x * 2`
  - ✅ Default parameters: `function f(x = 1, y = x + 1) { }`
  - ✅ Rest parameters: `function f(a, ...rest) { }` - collects remaining args into array
  - ✅ Spread operator: `[...arr]`, `fn(...args)` - expands arrays in literals and calls
  - ✅ Destructuring: `const [a, b] = arr`, `const {x, y} = obj` - with defaults, rest, and nesting
  - ✅ Classes: `class Foo { constructor() {} method() {} }` - class declarations and expressions
  - ✅ Class inheritance: `class Bar extends Foo { }` with `super()` and `super.method()` support
  - ✅ Static methods: `static myMethod() { }` on classes

- **Runtime semantics**
  - ✅ Closures: lexical capture of outer variables
  - ✅ Prototype chain: constructor `prototype` objects and prototype lookups
  - ✅ Garbage collection: mark-sweep with root management
  - ✅ `arguments` object: array-like object with passed arguments and `length` property

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

#### **Array Constructor & Methods** ✅ **COMPLETE** 
- ✅ `Array()`, `new Array()`, `Array.isArray(value)`, `Array.from()`, `Array.of()`
- ✅ `array.length` property with automatic management
- ✅ **Mutator methods**: `push()`, `pop()`, `shift()`, `unshift()`, `splice()`, `reverse()`, `sort()`
- ✅ **Search methods**: `find()`, `findIndex()`, `findLast()`, `findLastIndex()`, `indexOf()`, `lastIndexOf()`, `includes()`
- ✅ **Test methods**: `every()`, `some()`
- ✅ **Iteration methods**: `forEach()`, `map()`, `filter()`, `reduce()`, `reduceRight()`, `flatMap()`, `flat()`
- ✅ **Accessor methods**: `slice()`, `concat()`, `toString()`, `join()`
- ❌ **Iterator methods** (`keys()`, `values()`, `entries()`) require broader language iterator support

#### **String Constructor & Methods**
- ✅ `String()`
- ✅ `string.charAt`, `string.charCodeAt`, `string.concat`
- ✅ `string.indexOf`, `string.lastIndexOf`
- ✅ `string.slice`, `string.split`, `string.substring`
- ✅ `string.toLowerCase`, `string.toUpperCase`, `string.trim`
- ✅ `string.toString`, `string.valueOf`
- ✅ **String Escape Sequences** ✅ **NEW**
  - Basic escapes: `\n`, `\t`, `\r`, `\\`, `\"`, `\'`, `\0`, `\b`, `\f`, `\v`
  - Hex escapes: `\xHH` (e.g., `\x41` → "A")
  - Unicode escapes: `\uHHHH` (e.g., `\u2665` → "♥")
  - Unicode code point escapes: `\u{...}` (e.g., `\u{1F600}` → "😀")
  - Line continuation: backslash-newline in strings
  - All escapes work in both regular strings and template literals

#### **Math Object**
- ✅ Constants: `Math.PI`, `Math.E`, `Math.LN2`, `Math.LN10`, `Math.LOG2E`, `Math.LOG10E`, `Math.SQRT2`, `Math.SQRT1_2`
- ✅ Functions: `abs`, `floor`, `ceil`, `round`, `max`, `min`, `pow`, `sqrt`, `random`, `sign`, `trunc`, `sin`, `cos`, `tan`

#### **Object Constructor & Methods**
- ✅ `Object()`
- ✅ `Object.keys`, `Object.values`, `Object.entries`
- ✅ `object.hasOwnProperty`, `object.toString`, `object.valueOf`

#### **Boolean Constructor & Methods**
- ✅ `Boolean(x)` returns primitive boolean
- ✅ `new Boolean(x)` returns Boolean object with `.valueOf()`/`.toString()`
- ✅ `boolean.toString`, `boolean.valueOf`

#### **Number Constructor & Methods** ✅ **NEW**
- ✅ `Number(x)` returns primitive number
- ✅ `new Number(x)` returns Number object
- ✅ **Constants**: `Number.NaN`, `Number.POSITIVE_INFINITY`, `Number.NEGATIVE_INFINITY`, `Number.MAX_VALUE`, `Number.MIN_VALUE`, `Number.MAX_SAFE_INTEGER`, `Number.MIN_SAFE_INTEGER`, `Number.EPSILON`
- ✅ **Static methods**: `Number.isNaN()`, `Number.isFinite()`, `Number.isInteger()`, `Number.isSafeInteger()`, `Number.parseFloat()`, `Number.parseInt()`
- ✅ **Prototype methods**: `number.toString([radix])`, `number.valueOf()`, `number.toFixed()`, `number.toExponential()`, `number.toPrecision()`
- ⚠️ **Limitation**: Primitive auto-boxing not yet supported (use Number objects explicitly)

#### **Symbol Type & Methods** ✅ **NEW**
- ✅ `Symbol(description)` creates unique symbol
- ✅ `new Symbol()` throws TypeError (symbols cannot be constructed)
- ✅ `typeof symbol === 'symbol'`
- ✅ **Static methods**: `Symbol.for(key)`, `Symbol.keyFor(symbol)`
- ✅ **Prototype methods**: `symbol.toString()`, `symbol.valueOf()`, `symbol.description()`
- ✅ **Well-known symbols**: `Symbol.iterator`, `Symbol.toStringTag`, `Symbol.hasInstance`, `Symbol.toPrimitive`, `Symbol.unscopables`, `Symbol.isConcatSpreadable`
- ✅ **As property keys**: Symbols can be used as object property keys via bracket notation
- ⚠️ **Limitation**: `Symbol.for` must be accessed via bracket notation (`Symbol['for']`) due to parser handling of reserved keywords

#### **Error Constructor & Methods**
- ✅ `Error()`
- ✅ `error.toString`

#### **RegExp Constructor & Methods** ✅ **NEW**
- ✅ `new RegExp(pattern, flags)` creates regular expression objects
- ✅ `regexp.test(string)` returns true if pattern matches
- ✅ `regexp.toString()` returns string representation `/pattern/flags`
- ✅ **Properties**: `source`, `flags`, `global`, `ignoreCase`, `multiline`, `lastIndex`
- ✅ **Flags**: `g` (global), `i` (ignore case), `m` (multiline), `s` (dotAll)
- ⚠️ **Implementation**: Uses [Google RE2](https://github.com/google/re2) for safe, linear-time matching
- ⚠️ **Limitations**: 
  - RE2 does not support backreferences (e.g., `\1`, `\2`)
  - RE2 does not support lookahead/lookbehind assertions (e.g., `(?=...)`, `(?!...)`)
  - `exec()` currently returns null (not yet implemented with capture groups)
  - These limitations are by design to prevent ReDoS (Regular Expression Denial of Service) attacks
  - See [`docs/INTEGRATING_RE2.md`](docs/INTEGRATING_RE2.md) for detailed information

#### **JSON**
- ✅ `JSON.parse(text)` basic support:
  - Objects, arrays, strings, numbers (incl. exponent), booleans, null
  - Throws SyntaxError on invalid input
- ✅ `JSON.stringify(value)` basic support:
  - Primitives, plain objects (own enumerable props), arrays (by `length` and numeric indices)
  - `NaN`/`Infinity` become `null`; functions/undefined are skipped
- ⚠️ Limitations:
  - `reviver`/`replacer`/`space` options not implemented
  - Unicode escapes in strings are simplified; surrogate handling is not spec-accurate
  - Circular references are not handled (results in undefined/throw)
  - Array holes serialize as `null`
  - Property ordering follows internal `getOwnPropertyNames()`

#### **Set Constructor & Methods** ✅ **NEW**
- ✅ `new Set()` creates empty Set
- ✅ `new Set(iterable)` creates Set from iterable (arrays, other Sets, etc.)
- ✅ **Instance methods**: `add()`, `has()`, `delete()`, `clear()`, `forEach()`
- ✅ **Iterator methods**: `values()`, `keys()`, `entries()`, `[Symbol.iterator]`
- ✅ **Properties**: `size` (via getter)
- ✅ **SameValueZero equality**: NaN === NaN, +0 === -0
- ✅ **Insertion order preservation**: iteration yields values in insertion order

#### **Map Constructor & Methods** ✅ **NEW**
- ✅ `new Map()` creates empty Map
- ✅ `new Map(iterable)` creates Map from iterable of [key, value] pairs
- ✅ **Instance methods**: `get()`, `set()`, `has()`, `delete()`, `clear()`, `forEach()`
- ✅ **Iterator methods**: `keys()`, `values()`, `entries()`, `[Symbol.iterator]`
- ✅ **Properties**: `size` (via getter)
- ✅ **Any value as key**: objects, functions, primitives, NaN, undefined all work as keys
- ✅ **SameValueZero equality**: NaN === NaN, +0 === -0 for key comparison
- ✅ **Insertion order preservation**: iteration yields entries in insertion order
- ✅ **Method chaining**: `set()` returns the Map for chaining

### ❌ Not Yet Implemented

- **Language constructs**
  - ❌ Modules (`import`/`export`)
  - ❌ Optional chaining `?.`, nullish coalescing `??`

- **Built-in objects/APIs**
  - ❌ Date
  - ❌ Promise/Async (`async`/`await`), timers/event loop
  - ❌ WeakSet, WeakMap, Proxy
  - ❌ Function.prototype methods: `call`, `apply`, `bind`

### ℹ️ Notes & Limitations

- `this` binding: user-defined methods invoked via `obj.method()` now receive proper `this` binding. Built-in methods internally still access the receiver as the first argument.
- Variable declarations: `var`, `let`, and `const` are fully implemented with proper block scoping, Temporal Dead Zone (TDZ), and immutability semantics.

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
