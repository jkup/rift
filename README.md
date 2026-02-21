# Rift - A JavaScript Runtime in C++

A JavaScript runtime written in C++23 with a hand-written lexer, recursive descent parser, tree-walking evaluator, mark-sweep garbage collection, and a growing standard library of built-in objects.

## Building and Running

### Prerequisites

- C++23 compatible compiler (GCC 13+, Clang 16+)
- CMake 3.22 or higher
- Node.js 14+ (for test262 runner)
- Rust 1.83+ (for Temporal built-in)
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
# Full clean build
./build.sh

# Fast incremental build (after C++ changes, ~2-5s)
cd build && make -j$(sysctl -n hw.ncpu)
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

```bash
# Run the curated JS test suite (196/196 passing)
npm test

# Test262 (ECMAScript compliance testing)
npm run test262                                          # Full suite
npm run test262 -- --include="built-ins/Temporal"        # Filtered
npm run test262 -- test/built-ins/Array/from/Array.from-descriptor.js  # Single file
npm run test262:diff                                     # Regression check
```

### Code Quality

```bash
cd build

make format          # Auto-format all source files
make format-check    # Check formatting (used in CI)
make cppcheck        # Run cppcheck static analysis
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
1. Run `cd build && make format` to auto-format your code
2. Run `cd build && make quality` to check for issues
3. Ensure your code builds: `cd build && make -j$(sysctl -n hw.ncpu)`

## Implementation Status

### Language Features

- **Data types**
  - Primitives: `undefined`, `null`, `boolean`, `number`, `string`
  - Objects: Object literals, arrays, functions
  - Symbols: `Symbol(description)`, well-known symbols

- **Expressions**
  - Literals: string, number, boolean, null, undefined, object, array
  - Identifiers: variable access with lexical environments
  - Operators:
    - Arithmetic: `+`, `-`, `*`, `/`, `%`, `**` (exponentiation)
    - Comparison: `<`, `>`, `<=`, `>=`, `==`, `!=`, `===`, `!==`
    - Logical: `&&`, `||` with short-circuiting, unary `!`
    - Nullish coalescing: `??`
    - Bitwise: `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`
    - Unary: `+`, `-`, `~`, `typeof`, `void`, `delete`
    - Update: prefix/postfix `++`, `--` on identifiers and member expressions
    - Compound assignment: `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`, `??=`, `||=`, `&&=`
  - Member access: dot (`obj.prop`), computed (`obj[expr]`), optional chaining (`obj?.prop`, `obj?.[expr]`, `func?.()`)
  - Function calls: invocation with arguments and correct `this` binding for method calls
  - Assignment: variable and property assignment
  - Object construction: `new` operator with proper constructor `this` context
  - Template literals: basic support including `${expr}` interpolation
  - Computed property names: `{ [expr]: value }`
  - Shorthand properties/methods: `{ x, method() {} }`
  - Getter/setter in object literals: `{ get prop() {}, set prop(v) {} }`

- **Statements**
  - Variable declarations: `var`, `let`, `const` with proper block scoping and TDZ
  - Control flow: `if`/`else`, `while`, `do-while`, C-style `for (init; cond; update)`, `for-in`, `for-of`
  - `switch`/`case`/`default` with `break`
  - `break` and `continue` in loops
  - Labeled statements: `label: statement`, `break label`, `continue label`
  - Functions: declarations and expressions
  - `return`
  - Exceptions: `throw`, `try`/`catch`/`finally`

- **ES6+ Features**
  - Arrow functions: `() => expr`, `(a, b) => { ... }`, `x => x * 2`
  - Default parameters: `function f(x = 1, y = x + 1) { }`
  - Rest parameters: `function f(a, ...rest) { }` - collects remaining args into array
  - Spread operator: `[...arr]`, `fn(...args)` - expands arrays in literals and calls
  - Destructuring: `const [a, b] = arr`, `const {x, y} = obj` - with defaults, rest, and nesting
  - Classes: `class Foo { constructor() {} method() {} }` - class declarations and expressions
  - Class inheritance: `class Bar extends Foo { }` with `super()` and `super.method()` support
  - Static methods: `static myMethod() { }` on classes
  - Generators: `function* gen() { yield 1; }` with full iterator protocol support
  - Async functions: `async function f() { await promise; }` with proper microtask semantics
  - Async arrow functions: `async () => { await promise; }`
  - Async generators: `async function* gen() { yield await promise; }` with full async iterator protocol
  - `for-await-of`: async iteration over async iterables and async generators

- **Runtime semantics**
  - Closures: lexical capture of outer variables
  - Prototype chain: constructor `prototype` objects and prototype lookups
  - Garbage collection: mark-sweep with root management
  - `arguments` object: array-like object with passed arguments and `length` property

### Built-in Objects

#### Global Functions
- `parseInt(string, radix)`, `parseFloat(string)`
- `isNaN(value)`, `isFinite(value)`
- `eval(code)` — indirect eval semantics
- Global constants: `undefined`, `NaN`, `Infinity`, `globalThis`

#### Console Object
- `console.log(...args)`, `console.error(...args)`, `console.warn(...args)`, `console.info(...args)`

#### Array
- **Constructor**: `Array()`, `new Array()`, `Array.isArray()`, `Array.from()`, `Array.of()`
- **Mutator methods**: `push`, `pop`, `shift`, `unshift`, `splice`, `reverse`, `sort`, `fill`, `copyWithin`
- **Search methods**: `find`, `findIndex`, `findLast`, `findLastIndex`, `indexOf`, `lastIndexOf`, `includes`
- **Test methods**: `every`, `some`
- **Iteration methods**: `forEach`, `map`, `filter`, `reduce`, `reduceRight`, `flat`, `flatMap`
- **Accessor methods**: `slice`, `concat`, `join`, `toString`
- **Iterator methods**: `keys`, `values`, `entries`, `[Symbol.iterator]`

#### String
- **Constructor**: `String()`, `String.fromCharCode()`
- **Core methods**: `charAt`, `charCodeAt`, `concat`, `indexOf`, `lastIndexOf`, `slice`, `split`, `substring`, `toLowerCase`, `toUpperCase`, `trim`, `toString`, `valueOf`
- **Search/match**: `match`, `matchAll`, `search`, `replace`, `replaceAll`, `startsWith`, `endsWith`, `includes`
- **Padding/trimming**: `padStart`, `padEnd`, `trimStart`, `trimEnd`
- **Other**: `repeat`, `at`, `normalize`, `[Symbol.iterator]`
- **Escape sequences**: `\n`, `\t`, `\r`, `\\`, `\"`, `\'`, `\0`, `\b`, `\f`, `\v`, `\xHH`, `\uHHHH`, `\u{...}`, line continuation

#### Object
- **Static methods**: `keys`, `values`, `entries`, `assign`, `create`, `defineProperty`, `defineProperties`, `getOwnPropertyDescriptor`, `getOwnPropertyDescriptors`, `getOwnPropertyNames`, `getOwnPropertySymbols`, `getPrototypeOf`, `setPrototypeOf`, `freeze`, `isFrozen`, `seal`, `isSealed`, `preventExtensions`, `isExtensible`, `is`, `hasOwn`, `fromEntries`
- **Prototype methods**: `hasOwnProperty`, `propertyIsEnumerable`, `isPrototypeOf`, `toString`, `valueOf`

#### Math
- **Constants**: `PI`, `E`, `LN2`, `LN10`, `LOG2E`, `LOG10E`, `SQRT2`, `SQRT1_2`
- **Basic**: `abs`, `floor`, `ceil`, `round`, `max`, `min`, `pow`, `sqrt`, `random`, `sign`, `trunc`
- **Trigonometric**: `sin`, `cos`, `tan`, `acos`, `asin`, `atan`, `atan2`
- **Hyperbolic**: `cosh`, `sinh`, `tanh`, `acosh`, `asinh`, `atanh`
- **Exponential/logarithmic**: `exp`, `expm1`, `log`, `log1p`, `log2`, `log10`
- **Other**: `cbrt`, `clz32`, `fround`, `hypot`, `imul`

#### Number
- **Constructor**: `Number(x)`, `new Number(x)`
- **Constants**: `NaN`, `POSITIVE_INFINITY`, `NEGATIVE_INFINITY`, `MAX_VALUE`, `MIN_VALUE`, `MAX_SAFE_INTEGER`, `MIN_SAFE_INTEGER`, `EPSILON`
- **Static methods**: `isNaN`, `isFinite`, `isInteger`, `isSafeInteger`, `parseFloat`, `parseInt`
- **Prototype methods**: `toString([radix])`, `valueOf`, `toFixed`, `toExponential`, `toPrecision`
- Limitation: Primitive auto-boxing not fully supported (use Number objects explicitly)

#### Boolean
- `Boolean(x)` returns primitive, `new Boolean(x)` returns Boolean object
- `toString`, `valueOf`

#### Symbol
- `Symbol(description)` creates unique symbol
- **Static methods**: `Symbol.for(key)`, `Symbol.keyFor(symbol)`
- **Prototype**: `toString`, `valueOf`, `description`
- **Well-known symbols**: `Symbol.iterator`, `Symbol.toStringTag`, `Symbol.hasInstance`, `Symbol.toPrimitive`, `Symbol.unscopables`, `Symbol.isConcatSpreadable`, `Symbol.asyncIterator`
- Symbols work as object property keys via bracket notation
- Not yet implemented: `Symbol.species`, `Symbol.match`, `Symbol.matchAll`, `Symbol.search`, `Symbol.replace`, `Symbol.split`

#### Error
- **Base**: `Error(message)` with `message`, `name`, `toString`
- **Subtypes**: `TypeError`, `ReferenceError`, `SyntaxError`, `RangeError`, `EvalError`, `URIError`
- Limitation: No stack traces (`Error.stack` not implemented)

#### RegExp
- **Constructor**: `new RegExp(pattern, flags)`, `/pattern/flags` literal syntax
- **Methods**: `test(string)`, `exec(string)`, `toString()`
- **Properties**: `source`, `flags`, `global`, `ignoreCase`, `multiline`, `lastIndex`
- **Flags**: `g` (global), `i` (ignore case), `m` (multiline), `s` (dotAll)
- `exec()` returns match array with `index` property and capture groups
- Implementation uses [Google RE2](https://github.com/google/re2) for safe, linear-time matching
- Limitations: No backreferences (`\1`), no lookahead/lookbehind, no sticky flag (`y`), no named capture groups, no `d` (indices) flag

#### Date
- **Constructor**: `new Date()`, `new Date(ms)`, `new Date(string)`, `new Date(y, m, d, h, min, s, ms)`
- **Static methods**: `Date.now()`, `Date.parse(string)`, `Date.UTC(y, m, ...)`
- **Getters (local)**: `getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`, `getMinutes`, `getSeconds`, `getMilliseconds`, `getTimezoneOffset`
- **Getters (UTC)**: `getUTCFullYear`, `getUTCMonth`, `getUTCDate`, `getUTCDay`, `getUTCHours`, `getUTCMinutes`, `getUTCSeconds`, `getUTCMilliseconds`
- **Setters (local)**: `setFullYear`, `setMonth`, `setDate`, `setHours`, `setMinutes`, `setSeconds`, `setMilliseconds`, `setTime`
- **Setters (UTC)**: `setUTCFullYear`, `setUTCMonth`, `setUTCDate`, `setUTCHours`, `setUTCMinutes`, `setUTCSeconds`, `setUTCMilliseconds`
- **Conversion**: `toString`, `toDateString`, `toTimeString`, `toISOString`, `toJSON`, `toUTCString`, `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString`, `valueOf`
- **Legacy**: `getYear`, `setYear`, `toGMTString`

#### Temporal API
- ~52% test262 compliance (~1,950/4,165 tests passing)
- **Types**: `Temporal.Instant`, `Temporal.Duration`, `Temporal.PlainDate`, `Temporal.PlainTime`, `Temporal.PlainDateTime`, `Temporal.PlainYearMonth`, `Temporal.PlainMonthDay`, `Temporal.ZonedDateTime`
- **Namespace**: `Temporal.Now` (current time queries)
- Each type supports construction, `from()`, `compare()`, field getters, arithmetic (`add`/`subtract`), `toString`/`toJSON`/`valueOf`, and round-tripping

#### Promise
- `new Promise(executor)` with resolve/reject
- **Instance methods**: `then`, `catch`, `finally`
- **Static methods**: `Promise.resolve`, `Promise.reject`, `Promise.withResolvers` (ES2024)
- **Combinators**: `Promise.all`, `Promise.race`, `Promise.allSettled`, `Promise.any`
- Proper microtask queue, thenable adoption, chaining, and error propagation

#### Function
- `Function.prototype.call(thisArg, ...args)`
- `Function.prototype.apply(thisArg, argsArray)`
- `Function.prototype.bind(thisArg, ...args)` with partial application
- `Function.prototype.toString()`

#### Generators
- `function* name() { }` declarations and expressions
- `yield value`, `yield* iterable` (delegation)
- Iterator protocol: `next()`, `return()`, `throw()`
- Value passing via `gen.next(value)`
- Works with `[...gen()]`, `Array.from(gen())`, `for...of`

#### JSON
- `JSON.parse(text)` — objects, arrays, strings, numbers, booleans, null
- `JSON.stringify(value)` — primitives, objects, arrays; `NaN`/`Infinity` become `null`
- Limitations: No `reviver`/`replacer`/`space` options; no circular reference detection

#### Map & Set
- `new Map()`, `new Map(iterable)` — `get`, `set`, `has`, `delete`, `clear`, `forEach`, `keys`, `values`, `entries`, `size`, `[Symbol.iterator]`
- `new Set()`, `new Set(iterable)` — `add`, `has`, `delete`, `clear`, `forEach`, `values`, `keys`, `entries`, `size`, `[Symbol.iterator]`
- SameValueZero equality, insertion order preservation

#### WeakMap & WeakSet
- `new WeakMap()` — `get`, `set`, `has`, `delete`
- `new WeakSet()` — `add`, `has`, `delete`
- Object-only keys; weak references allow GC of keys

#### WeakRef
- `new WeakRef(target)` — creates a weak reference to `target`
- `deref()` — returns the target if still alive, `undefined` if collected

#### FinalizationRegistry
- `new FinalizationRegistry(callback)` — creates a registry with cleanup callback
- `register(target, heldValue [, unregisterToken])` — registers a target for cleanup notification
- `unregister(unregisterToken)` — removes registrations matching the token
- Note: cleanup callbacks are not proactively invoked (spec allows implementation-defined timing)

### Not Yet Implemented

- **Language features**
  - Modules (`import`/`export`)
  - Private class fields/methods (`#field`)
  - Decorators

- **Built-in objects/APIs**
  - BigInt
  - Proxy & Reflect
  - TypedArray / ArrayBuffer / DataView
  - SharedArrayBuffer / Atomics
  - Intl (internationalization)

- **Host APIs** (not ECMA-262)
  - Timers (`setTimeout`, `setInterval`)
  - Event loop

### Notes & Limitations

- **Tree-walking interpreter**: Rift uses a tree-walking evaluator (no bytecode compiler or JIT). Correct behavior is prioritized over performance.
- **RegExp via RE2**: Uses Google RE2 for guaranteed linear-time matching. This means no backreferences (`\1`), no lookahead/lookbehind assertions. This is by design to prevent ReDoS attacks.
- **Number auto-boxing**: Calling methods on number literals (e.g., `(42).toString()`) requires Number wrapper objects in some cases.
- **Error objects**: No stack traces — `Error.stack` is not implemented.
- **`this` binding**: User-defined methods invoked via `obj.method()` receive proper `this` binding.
- **Variable declarations**: `var`, `let`, and `const` are fully implemented with proper block scoping, Temporal Dead Zone (TDZ), and immutability semantics.

## Architecture

The runtime follows a modern interpreter architecture:

1. **Frontend**
   - **Lexer**: Tokenizes JavaScript source code
   - **Parser**: Recursive descent parser producing an AST

2. **Core Engine**
   - **Expression Evaluator**: Handles expressions (literals, operators, function calls)
   - **Statement Evaluator**: Handles statements (control flow, declarations)
   - **Operation Handler**: Implements JavaScript type coercion and operators

3. **Runtime System**
   - **Value System**: Type-safe value representation
   - **Environment**: Variable scope and binding management
   - **Memory Management**: Mark-sweep garbage collector

4. **Built-in Library**
   - **Object Factory**: GC-managed object creation
   - **Built-in Objects**: Standard library implementation

## Memory Management

Rift features a **production-quality garbage collector**:

- **Mark-sweep algorithm** with proper cycle detection
- **Automatic memory management** - no manual memory handling required
- **Exception-safe collection** - GC defers during exception handling
- **Root set management** - proper handling of stack references
- **Clean shutdown** - safe program termination without crashes

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [test262](https://github.com/tc39/test262) - ECMAScript Test Suite
- [Google RE2](https://github.com/google/re2) - Regular expression engine
- ECMAScript specification for language semantics
