# Contributing to Rift

## Architecture Overview

Rift follows a classic interpreter architecture: **Source → Lexer → Parser → AST → Evaluator → Runtime**.

### **Frontend** (`include/frontend/`, `src/frontend/`)
- **Lexer** (`lexer.h/cpp`): Breaks source code into tokens (keywords, operators, literals)
- **Parser** (`parser.h/cpp`): Converts tokens into an Abstract Syntax Tree (AST)
- **AST** (`ast_node.h`, `ast_factory.h`): Tree representation of JavaScript code
- **Tokens** (`token.h`): Individual lexical units (numbers, strings, identifiers, etc.)

### **Core Engine** (`include/core/engine/`, `src/core/engine/`)
- **Rift** (`engine.h/cpp`): Main engine coordinator, manages global environment and GC
- **ExpressionEvaluator** (`expression_evaluator.h/cpp`): Handles expressions (math, function calls, object access)
- **StatementEvaluator** (`statement_evaluator.h/cpp`): Handles statements (if/while/try-catch/functions)
- **OperationHandler** (`operation_handler.h/cpp`): Implements JavaScript operators (+, -, ==, etc.)
- **BuiltinManager** (`builtin_manager.h/cpp`): Sets up built-in objects (Array, Object, Error, etc.)

### **Runtime** (`include/runtime/`, `src/runtime/`)
- **Value** (`values/value.h/cpp`): JavaScript values (undefined, null, boolean, number, string, object)
- **JSObject** (`values/object.h/cpp`): JavaScript objects with properties and prototype chain
- **JSFunction**: JavaScript functions (stored as JSObject with callable behavior)
- **Environment** (`environment/environment.h/cpp`): Variable scopes and lexical environments

### **Memory Management** (`include/memory/`, `src/memory/`)
- **ObjectManager** (`object_manager.h/cpp`): Creates and tracks all JavaScript objects
- **MarkSweepGC** (`mark_sweep_gc.cpp`): Garbage collector using mark-and-sweep algorithm
- **GCEnvironment** (`gc_environment.h/cpp`): Makes environments GC-aware

### **Built-ins** (`include/builtins/`, `src/builtins/`)
Each built-in follows the same pattern:
- **Console** (`console/`): `console.log()`, `console.error()`
- **Math** (`math/`): `Math.PI`, `Math.abs()`, etc.
- **Array** (`array/`): `Array()` constructor, `push()`, `pop()`, etc.
- **Object** (`object/`): `Object()` constructor, `Object.keys()`, etc.
- **String** (`string/`): `String()` constructor, string methods
- **Boolean** (`boolean/`): `Boolean()` constructor
- **Error** (`error/`): `Error()` constructor, `toString()` method

### **API** (`include/api/`, `src/api/`)
- **JavaScript** (`api.h/cpp`): Public C++ API for executing JavaScript code

## Key Concepts

### **Value System**
Everything in JavaScript is a `Value`. Values have types (undefined, null, boolean, number, string, object) and can be converted between types.

```cpp
Value num(42.0);           // Number
Value str("hello");        // String  
Value obj(jsObjectPtr);    // Object
```

### **AST Evaluation**
The engine walks the AST recursively:
1. **Expressions** return values (variables, math, function calls)
2. **Statements** perform actions (assignments, control flow, declarations)

### **Environment Chain**
Variables live in environments. Child environments can access parent variables (lexical scoping).

```javascript
function outer() {
    var x = 1;
    function inner() {
        return x; // Finds x in parent environment
    }
}
```

### **Object Model**
- All objects are `JSObject` instances with property maps
- Prototype chain: `obj → obj.__proto__ → Object.prototype → null`
- Functions are objects with a `call()` method

### **Exception Handling**
- `throw` statements create `JavaScriptException`
- `return` statements create `ReturnException` 
- Try-catch blocks catch and handle these exceptions

### **Garbage Collection**
- Mark-and-sweep GC runs automatically
- Objects reachable from roots (global environment) are kept
- Unreachable objects are deleted
- GC can be disabled during exception handling to prevent crashes

## Testing

- **Unit tests**: `test/` directory with `.js` files
- **Test runner**: `test-runner.js` (Node.js) and `./run-tests.sh`
- **Test262**: Official ECMAScript test suite via `test262-runner.js`

## Build System

```bash
./build.sh          # Build the project
./build/rift file.js # Run JavaScript file
./run-tests.sh       # Run unit tests
```

Built with CMake, organized by modules in `CMakeLists.txt`.

## Current Status

**Working**: Variables, functions, objects, arrays, strings, booleans, arithmetic, control flow, try-catch, Error constructor, basic built-ins, garbage collection

**Missing**: `this` keyword, template literals, closures, `Function.prototype.call/apply`, most built-in objects/methods

## Code Style

- Use `snake_case` for variables/functions
- Use `PascalCase` for classes
- Prefer smart pointers (`std::shared_ptr`, `std::unique_ptr`)
- Keep functions focused and small
- Add comments for complex logic