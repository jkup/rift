# Contributing to Rift

Thanks for your interest in Rift, a JavaScript runtime written in C++23. This
document is a high-level orientation. For detailed, task-by-task instructions
(adding an operator, a built-in method, a new built-in object, etc.), see
[`CLAUDE.md`](CLAUDE.md), which is the authoritative developer guide.

## Architecture Overview

Rift follows a classic interpreter architecture:

**JS source → Lexer (tokens) → Parser (AST) → Engine `evaluate()` → Value**

It has a hand-written lexer, a recursive descent parser, a tree-walking
evaluator, mark-sweep garbage collection, and a growing standard library of
built-in objects (Array, String, Object, Map, Set, RegExp, Promise, Temporal,
…). It targets ECMAScript compliance as measured by the test262 suite.

Headers live under `include/rift/` and mirror the `src/` layout.

### Frontend — `src/frontend/`
- **Lexer** (`lexer/lexer.cpp`): turns source into tokens one at a time via
  `next_token()`. Token types are defined in
  `include/rift/frontend/lexer/token.h`.
- **Parser** (`parser/`): recursive descent.
  `parser_expressions.cpp` handles operators, calls, and member access;
  `parser_statements.cpp` handles declarations and control flow. AST nodes are
  built with `ASTFactory::make*()`.

### Interpreter — `src/interpreter/`
- **Engine** (`engine.cpp`): the `evaluate()` dispatcher. A switch on
  `ASTNodeType` routes each node to the expression or statement evaluator. If
  you add a new AST node type, you must add it here or it silently evaluates to
  `undefined`.
- **ExpressionEvaluator** (`expression_evaluator*.cpp`): expressions — calls,
  member access, `new`, array/object literals, assignment operators.
- **StatementEvaluator** (`statement_evaluator*.cpp`): declarations and control
  flow (if/for/while/switch/try-catch).
- **class_builder.cpp**, **generator_evaluator.cpp**, **async_executor.cpp**,
  **async_generator_evaluator.cpp**: classes, generators, and async execution.

### Foundation types — `src/types/`
- **Value** (`value.cpp`): a JavaScript value — number, string, boolean, null,
  undefined, object, or function.
- **JSObject / JSFunction** (`object.cpp`): objects with properties and a
  prototype chain; functions are callable objects.
- **operations.cpp**: type coercion, arithmetic, and comparison (spec §7).

### Execution context — `src/execution/`
- **Environment** (`environment.cpp`): variable scoping and lexical
  environments (child scopes resolve up to parents).
- **microtask_queue.cpp**: the Promise microtask queue.

### Memory — `src/memory/`
- **ObjectManager** (`object_manager.cpp`) and the ObjectFactory: create and
  track all JS objects. **Always create objects through the factory**, never
  with raw `new`.
- **MarkSweepGC** (`mark_sweep_gc.cpp`): mark-and-sweep collector.
- **GCProtector** (`gc_protector.cpp`) and **GCDisabler** (`gc_disabler.cpp`):
  RAII helpers to root objects (or pause GC) while you initialize them — see
  *GC Safety* below.

### Built-ins — `src/builtins/`
One folder per type. `builtin_manager.cpp` wires up all the prototypes. Each
built-in extends the `BuiltinBase<T>` CRTP base and registers methods with the
`RIFT_METHOD` / `RIFT_STATIC_METHOD` / `RIFT_GETTER` macros. See `map/`,
`array/`, or any existing built-in for the pattern.

### Host APIs — `src/host/`
Non-spec host functionality such as `console` (`console/console.cpp`).

### Public API — `src/api/`
`api.cpp`: the embedding/C++ entry point for executing JavaScript.

## Key Patterns

### GC Safety
- **Create objects via the ObjectFactory**, never raw `new`.
- Use a `GCProtector` when you set multiple properties on a fresh object before
  returning it — it roots the object for its lifetime so the collector won't
  reclaim it mid-initialization.
- Disable GC (`setGCEnabled(false)` / `GCDisabler`) when creating many objects
  in a tight loop, then restore the previous state.

### Exceptions as control flow
Non-local control flow is modeled with C++ exceptions: `JavaScriptException`
for thrown JS errors, plus `ReturnException`, `BreakException`,
`ContinueException`, and `YieldException` for returns, loop control, and
generators. Never `catch(...)` — catch the specific exception type, and always
null-check `dynamic_cast` results.

### AST node metadata
Semantic flags ride on the `ASTNode::metadata` string field (e.g. `"computed"`
for `obj[key]`, `"optional"` for `obj?.prop`, `"rest"` for `...args`). The full
table is in [`CLAUDE.md`](CLAUDE.md).

## Building

Prerequisites: a C++23 compiler (GCC 13+ / Clang 16+), CMake 3.22+, Node.js
14+, and Rust 1.83+ (for the Temporal built-in).

```bash
./build.sh                                   # full clean build
cd build && make -j$(sysctl -n hw.ncpu)      # fast incremental build (~2-5s)
./build/rift path/to/script.js               # run a file
./build/rift -e "console.log('hi')"          # run inline JS
```

## Testing

```bash
npm test                                     # custom tests in test/
npm run test262                              # full test262 suite (slow)
npm run test262 -- --include="built-ins/Temporal"   # filtered run
npm run test262:diff                         # show regressions vs baseline
```

When you implement a feature, remove it from the `UNSUPPORTED_FEATURES` set in
`scripts/test262/core.js` so its tests stop being skipped.

## Code Style

- `PascalCase` classes, `camelCase` functions, `snake_case` variables,
  `UPPER_CASE` constants, `trailing_underscore_` private members.
- 4-space indentation, 100-character line limit.
- Reference the spec: <https://262.ecma-international.org/16.0/>. When you touch
  an annotated method, keep its `@spec` step comments in sync (see
  `docs/STYLE_GUIDE.md`).
- Run `cd build && make format` (clang-format) before committing.
