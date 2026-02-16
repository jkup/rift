# CLAUDE.md - Rift JavaScript Runtime

## Commands

| Task | Command |
|------|---------|
| Build | `./build.sh` |
| Incremental build | `cd build && make -j$(sysctl -n hw.ncpu)` |
| Run JS file | `./build/rift path/to/script.js` |
| Run inline JS | `./build/rift -e "console.log('hi')"` |
| Custom tests | `npm test` |
| Test262 (full) | `npm run test262` |
| Test262 (filtered) | `npm run test262 -- --include="built-ins/Temporal"` |
| Test262 (single file) | `npm run test262 -- test/built-ins/Array/from/Array.from-descriptor.js` |
| Test262 regressions | `npm run test262:diff` |
| Format code | `cd build && make format` |

After any C++ change: `cd build && make -j$(sysctl -n hw.ncpu)` (fast incremental, ~2-5s). Use `./build.sh` only for clean builds.

Build requires: C++23 compiler, CMake 3.22+, Node.js 14+, Rust 1.83+ (for Temporal).

## What This Project Is

Rift is a JavaScript runtime written in C++23. It has a hand-written lexer and recursive descent parser, a tree-walking evaluator, mark-sweep garbage collection, and built-in objects (Array, String, Object, Map, Set, RegExp, Promise, Temporal, etc.). It targets ECMAScript compliance measured via the test262 suite.

Current status: 196/196 custom tests pass. ~11,300/50,594 test262 tests pass (~36%). ~1,950/4,165 Temporal tests pass (~52%).

## Project Layout

```
src/frontend/lexer/lexer.cpp          # Tokenizer (lexer.h has TokenType enum)
src/frontend/parser/                   # Recursive descent parser
    parser_expressions.cpp             # Expression parsing (operators, calls, members)
    parser_statements.cpp              # Statement parsing (var/let/const, if, for, etc.)
src/core/engine/
    engine.cpp                         # Main evaluate() dispatcher — routes AST nodes
    expression_evaluator.cpp           # Expression dispatch switch
    expression_evaluator_objects.cpp   # Call, member access, new, array/object literals
    expression_evaluator_assignment.cpp # Assignment operators (=, +=, ??=, etc.)
    statement_evaluator.cpp            # Statements: function decl, var decl, control flow
    statement_evaluator_control_flow.cpp # if/for/while/switch/try-catch
    operation_handler.cpp              # Arithmetic and comparison ops
    builtin_manager.cpp                # Wires up all built-in prototypes
src/builtins/                          # Built-in JS objects (one folder per type)
src/runtime/values/
    value.h                            # Value type (number, string, bool, null, undefined, object, function)
    object.h                           # JSObject, JSFunction, JSArrowFunction classes
src/runtime/environment/               # Variable scoping (Environment class)
src/memory/                            # GC: ObjectFactory, ObjectManager, GCProtector
include/rift/                          # Headers (mirrors src/ structure)
test/                                  # Custom test files (*.js)
test262/                               # ECMAScript test suite
scripts/test262/                       # Test runner infrastructure
    core.js                            # UNSUPPORTED_FEATURES list, harness loading
    runner.js                          # Main test runner
notes/                                 # Working notes (RESUME.md, TODO.md, TEMPORAL.md)
```

## How the Pipeline Works

**JS source** -> **Lexer** (tokens) -> **Parser** (AST) -> **Engine evaluate()** -> **Value**

### Lexer (`src/frontend/lexer/lexer.cpp`)
- `next_token()` returns one token at a time. Tracks `last_token_type_` for regex-vs-division disambiguation.
- Token types defined in `include/rift/frontend/lexer/token.h`. New keywords/operators need a `TokenType` enum entry.

### Parser (`src/frontend/parser/`)
- Recursive descent. `parse_expression()` calls `parse_binary_expression(0)` which calls `parse_unary_expression()` -> `parse_postfix_expression()` -> `parse_primary()`.
- `parse_postfix_expression()` is the main access/call loop: handles `.`, `[]`, `()`, `?.` in a while-true chain.
- `parse_binary_expression(min_precedence)` handles all binary operators via precedence climbing.
- AST nodes created via `ASTFactory::make*()` static methods. Each node has `type`, `value`, `metadata`, `children`, `line`, `column`.

### Engine Dispatcher (`src/core/engine/engine.cpp`)
- `engine.cpp evaluate()` has a switch on `ASTNodeType` routing to either `ExpressionEvaluator::evaluate()` or `StatementEvaluator::evaluate()`.
- **If you add a new AST node type**, you must add it to this switch or it silently returns `undefined`.

### Evaluators
- `expression_evaluator.cpp` has a switch routing to specialized methods (most in `expression_evaluator_objects.cpp`).
- `statement_evaluator.cpp` similarly routes to specialized methods (some in `statement_evaluator_control_flow.cpp`).

## AST Node Metadata Conventions

The `ASTNode::metadata` string field carries semantic flags:

| Metadata | Node Type | Meaning |
|----------|-----------|---------|
| `"computed"` | MemberExpression | Bracket notation: `obj[key]` |
| `"optional"` | MemberExpression, CallExpression | Optional chaining: `obj?.prop`, `func?.()` |
| `"computed-optional"` | MemberExpression | Optional computed: `obj?.[key]` |
| `"declaration-list"` | BlockStatement | Wrapper for `var a, b = 1, c` (skip scope creation) |
| `"destructuring"` | VariableDeclaration | Has destructuring pattern |
| `"rest"` | Parameter (Identifier) | Rest parameter: `...args` |
| `"expression"` | ArrowFunctionExpression | Expression body (implicit return) |
| `"async"` | ArrowFunctionExpression | Async arrow |
| `"delegate"` | YieldExpression | `yield*` delegation |
| `"getter"` / `"setter"` | MethodDefinition | Accessor method |
| `"computed_key"` | Property in ObjectLiteral | Computed property key |
| `"string"` / `"number"` / `"boolean"` / `"null"` / `"regex"` | Literal | Literal subtype |

## Adding a New Operator or Syntax

Example: adding a new binary operator.

1. **Lexer**: Add `TokenType` enum in `token.h`. Add tokenization in `lexer.cpp` `next_token()`.
2. **Parser**: Handle in `parse_binary_expression()` (for binary ops) or `parse_postfix_expression()` (for member/call-like ops). Return appropriate AST node.
3. **Engine dispatcher**: If new `ASTNodeType`, add case in `engine.cpp` evaluate switch.
4. **Evaluator**: Implement evaluation in the appropriate evaluator file.
5. **Build**: `cd build && make -j$(sysctl -n hw.ncpu)` (only changed files recompile).
6. **Test**: `./build/rift -e "..."` to verify, then `npm test` for regressions.

## Adding a New Built-in Method

To add a method to an existing built-in (e.g., `Array.prototype.flat`):

1. Add declaration in header: `static Value flat(const CallContext& ctx, const std::vector<Value>& args);`
2. Register in `setupPrototypeMethods`: `RIFT_METHOD(prototype, "flat", Array::flat);`
3. Implement the method. Access `this` via `ctx.thisValue`. Return a `Value`.

The `RIFT_METHOD` macro creates a JSFunction with `name` and `length` properties set automatically.

## Adding a New Built-in Object

Follow the `BuiltinBase<T>` CRTP pattern (see any existing builtin like `src/builtins/map/map.cpp`):

1. Create header in `include/rift/builtins/<name>/<name>.h` extending `BuiltinBase<YourType>`
2. Create implementation in `src/builtins/<name>/<name>.cpp`
3. Register prototype methods with `RIFT_METHOD()` / `RIFT_STATIC_METHOD()` / `RIFT_GETTER()`
4. Wire up in `builtin_manager.cpp`: add `setup<Name>()`, call from `setupBuiltins()`, add prototype accessor
5. Add `.cpp` to `BUILTINS_SOURCES` in `CMakeLists.txt`

Macros available:
- `RIFT_METHOD(prototype, "name", Class::method)` — instance method (non-enumerable)
- `RIFT_STATIC_METHOD(constructor, "name", Class::method)` — static method
- `RIFT_GETTER(prototype, "name", Class::getter)` — getter property
- `RIFT_PROPERTY(obj, "name", value)` — constant property

## Critical Patterns

### GC Safety

**Always use ObjectFactory** to create JS objects (never raw `new`):
```cpp
auto* obj = engine->getObjectFactory()->createJSObject(prototype);
```

**Use GCProtector** when initializing an object with multiple property sets:
```cpp
GCProtector protect(obj, getObjectFactory()->getObjectManager());
obj->setProperty("x", Value(1.0));  // Safe — obj is a GC root
obj->setProperty("y", Value(2.0));
return Value(obj);  // GCProtector destructor un-roots it
```

**Disable GC** when creating many objects in a loop:
```cpp
auto* om = factory->getObjectManager();
bool was = om->isGCEnabled();
om->setGCEnabled(false);
// ... create objects ...
om->setGCEnabled(was);
```

### Exception Handling

- **Never `catch(...)`** — swallows system exceptions. Always catch specific types.
- JS exceptions: `throw JavaScriptException(Value("TypeError: ..."), line, col);`
- Return from function: `throw ReturnException(value);`
- Always check `dynamic_cast` results for nullptr before use.

### Namespace Prefixes in Builtins

Inside `rift::builtins` code, use fully-qualified names for engine types:
```cpp
rift::core::BuiltinManager::getArrayPrototype()
rift::core::EvaluationUtils::symbolToPropertyKey(id)
```

### Property Descriptors

```cpp
// Data property: PropertyDescriptor(value, writable, enumerable, configurable)
obj->defineProperty("name", PropertyDescriptor(Value("hello"), true, false, true));

// Accessor property:
PropertyDescriptor::accessor(getter_value, setter_value, enumerable, configurable)
```

## Working Preferences

- When completing TODO items, **remove finished items entirely** (don't mark as done or strikethrough).
- Working notes go in `notes/` (RESUME.md tracks session state, TODO.md tracks planned work).
- **Spec comment maintenance:** When modifying an annotated method (e.g., fixing a test262 failure or adding missing spec steps), update the `@spec` step comments to match the new implementation. Remove INCOMPLETE tags when steps are added; update SIMPLIFIED/DEVIATION tags when behavior changes. See `docs/STYLE_GUIDE.md` for the full spec comment style guide.

## Code Style

- Classes: `PascalCase`, Functions: `camelCase`, Variables: `snake_case`, Constants: `UPPER_CASE`, Private members: `trailing_underscore_`
- 4-space indent, 100-char line limit
- ECMAScript spec compliance: reference https://262.ecma-international.org/16.0/
- `make format` before committing

## Debugging Test262 Failures

### Analyzing failure patterns
After running `npm run test262`, results are saved to `test262-results.json`:
```js
// Analyze top failure causes:
node -e "
const data = JSON.parse(require('fs').readFileSync('test262-results.json', 'utf8'));
const failed = data.tests.filter(t => t.status === 'failed');
const errors = {};
failed.forEach(r => {
  let msg = (r.reason || '').replace(/^\[non-strict\] /, '').substring(0, 100);
  errors[msg] = (errors[msg] || 0) + 1;
});
Object.entries(errors).sort((a,b) => b[1]-a[1]).slice(0,20).forEach(([m,c]) => console.log(c,m));
"
```

### Running a single test with harness
The runner combines harness files + test code. To reproduce manually:
```bash
cat scripts/test262/harness-compat.js \
    test262/harness/assert.js \
    test262/harness/sta.js \
    test262/harness/propertyHelper.js \
    test262/test/path/to/test.js > /tmp/combined.js
./build/rift /tmp/combined.js
```

### Binary search for harness parse failures
When a harness file (like `temporalHelpers.js`) fails to load, binary search at method boundaries:
```bash
# Find method boundaries
grep -n '^  },' test262/harness/temporalHelpers.js
# Test up to a boundary
head -N test262/harness/temporalHelpers.js > /tmp/test.js
echo "};" >> /tmp/test.js
echo "console.log('OK at N');" >> /tmp/test.js
./build/rift /tmp/test.js
```

### Test262 feature skipping
Tests are skipped based on `UNSUPPORTED_FEATURES` in `scripts/test262/core.js`. When you implement a feature, **remove it from this set** to unskip those tests.

### Common root causes for bulk failures
- **Harness parse failure**: One syntax gap in a harness file (assert.js, propertyHelper.js, temporalHelpers.js) cascades to hundreds/thousands of tests. Fix the parse gap and hundreds of tests pass at once.
- **Missing prototype method**: A missing method like `propertyIsEnumerable` causes every test using `propertyHelper.js` to fail.
- **Silent parse recovery**: `parse_program()` catches parser exceptions and skips to the next semicolon. This means parse failures inside object literals or function bodies are silently swallowed — the variable just ends up `undefined` at runtime. If you see `X is not defined` errors, consider that X's definition may have failed to parse.

## Current Known Limitations

**Not yet implemented:** BigInt, Date, Proxy, Reflect, ArrayBuffer/TypedArray, Intl, WeakRef, FinalizationRegistry, private class fields, top-level await, numeric property names in class getters/setters.

**Parser gaps:** Strict mode SyntaxError enforcement (too permissive), numeric/string literal method names in classes (`get 0b10() {}`), some destructuring edge cases in arrow params.

**See `notes/TODO.md`** for the prioritized improvement plan with estimated test262 impact per task.
