# ECMAScript Spec Comment Style Guide

Style guide for maintaining ECMAScript specification references in the Rift codebase. Every `.cpp` implementation file and `.h` header file for builtins, engine evaluators, and frontend (lexer/parser) is annotated with spec comments. This guide ensures consistency when adding or modifying code.

---

## Why Spec Comments Matter

Both Kiesel and Boa credit spec-step comments as a major contributor to correctness. When every method maps line-by-line to the spec, you can:
- Spot missing steps (a common source of test262 failures)
- Verify correctness by reading code alongside the spec
- Identify intentional deviations vs accidental omissions

---

## The Spec Reference

All references point to the **ECMA-262** living specification. The latest finalized edition is **ES2025 (16th Edition, June 2025)**.

- Living spec (single page): https://tc39.es/ecma262/
- **Multipage spec (use this for fetching):** https://tc39.es/ecma262/multipage/
- Anchored sections: `https://tc39.es/ecma262/#sec-<section-name>`
- Finalized ES2025: https://262.ecma-international.org/16.0/
- Temporal (Stage 3): https://tc39.es/proposal-temporal/

**Important:** The single-page spec is ~6MB of HTML and will break or truncate with WebFetch. Always use the **multipage** version when fetching. Each chapter is a separate page:

| Page | Contents |
|------|----------|
| `numbers-and-dates.html` | Number, Math, Date |
| `indexed-collections.html` | Array, TypedArray |
| `text-processing.html` | String, RegExp |
| `keyed-collections.html` | Map, Set, WeakMap, WeakSet |
| `fundamental-objects.html` | Object, Function, Boolean, Symbol, Error |
| `control-abstraction-objects.html` | Promise, Generator |
| `structured-data.html` | JSON, ArrayBuffer |
| `global-object.html` | Global functions |
| `abstract-operations.html` | Type conversions, comparisons |
| `ecmascript-language-expressions-and-operators.html` | Expressions |
| `ecmascript-language-statements-and-declarations.html` | Statements |
| `ecmascript-language-lexical-grammar.html` | Lexer |

For comments, use the **anchored single-page URL** (e.g., `https://tc39.es/ecma262/#sec-array.prototype.push`) since it's shorter and more readable.

**Section numbers vs anchor names:** Section numbers (like `23.1.3.20`) shift between spec editions. The `#sec-` anchor names (like `#sec-array.prototype.push`) are stable. **Policy: use ES2025 (16th Edition) section numbers** since they're the latest finalized reference.

**`@spec` tag for grepability:** All spec URL comments must use the `@spec` prefix:

```cpp
// 23.1.3.20 Array.prototype.push ( ...items )
// @spec https://tc39.es/ecma262/#sec-array.prototype.push
```

This enables coverage auditing (`grep -r "@spec" src/`), generating spec coverage reports, and finding unannotated methods.

---

## How to Find the Right Spec Section

**Fastest method — use MDN as a bridge:**

Every MDN page has a "Specifications" section at the bottom with the exact `#sec-` anchor URL:

1. Fetch `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push`
2. Find the "Specifications" section — it links to `https://tc39.es/ecma262/#sec-array.prototype.push`
3. Use that anchor in your comment
4. Then fetch the multipage spec page to get the algorithm steps

**MDN URL pattern:** `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/<Object>/<method>`

---

## Comment Style: Implementation Files (`.cpp`)

### File-Level Header

Every `.cpp` file starts with a file-level comment after the includes:

```cpp
// ============================================================================
// ECMA-262 — Array Mutator Methods (push, pop, shift, unshift, splice, ...)
// @spec https://tc39.es/ecma262/#sec-array.prototype.push (and related sections)
// See also: array.cpp (constructor/statics), array_accessors.cpp, array_iterators.cpp
// ============================================================================
```

### Method-Level Comment

Every method has a spec section reference above it:

```cpp
// 23.1.3.20 Array.prototype.push ( ...items )
// @spec https://tc39.es/ecma262/#sec-array.prototype.push
Value Array::push(const CallContext& ctx, const std::vector<Value>& args) {
```

### Inline Step Comments

Where the implementation follows spec algorithm steps, number them:

```cpp
Value Array::push(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 5. For each element E of items, do
    for (size_t i = 0; i < args.size(); ++i) {
        //   a. Perform ? Set(O, ! ToString(len), E, true).
        arrayObj->setProperty(std::to_string(length), args[i]);
        //   b. Set len to len + 1.
        length++;
    }

    // 6. Perform ? Set(O, "length", len, true).
    setArrayLength(arrayObj, length);

    // 7. Return len.
    return Value(static_cast<double>(length));
}
```

**Trivial method carve-out:** For pass-through methods with fewer than 3 spec steps (e.g., `Math.abs`, `Math.floor`), the method-level header with `@spec` URL is sufficient — inline step comments are optional.

### Engine Files (Evaluators, Operation Handler)

Engine files implement evaluation semantics and abstract operations. The format adapts:

```cpp
// 13.5.3 Runtime Semantics: Evaluation — The typeof Operator
// @spec https://tc39.es/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
Value ExpressionEvaluator::evaluateTypeofExpression(...) {
    // 1. Let val be ? GetValue(? Evaluation of UnaryExpression).
    // SIMPLIFIED: Rift evaluates the operand directly (no Reference type).
```

### Parser/Lexer Files

Parser spec references point to grammar productions:

```cpp
// 13.6-13.13 Binary Operators (Precedence Climbing)
// SIMPLIFIED: The spec defines each as a separate grammar production.
// Rift uses a single precedence-climbing loop.
// @spec https://tc39.es/ecma262/#sec-multiplicative-operators
std::shared_ptr<ASTNode> Parser::parse_binary_expression(int min_precedence) {
```

```cpp
// 12.8.3 Numeric Literals
// NumericLiteral :: DecimalLiteral | NonDecimalIntegerLiteral
// @spec https://tc39.es/ecma262/#sec-literals-numeric-literals
void Lexer::read_number() {
```

---

## Comment Style: Header Files (`.h`)

Headers use the concise `///` format — 2 lines per method, no verbose descriptions:

### Class-Level Comment

```cpp
/// 23.1 Array Objects
/// @spec https://tc39.es/ecma262/#sec-array-objects
class Array : public BuiltinBase<Array> {
```

### Method Declarations

```cpp
/// 23.1.3.21 Array.prototype.push ( ...items )
/// @spec https://tc39.es/ecma262/#sec-array.prototype.push
static Value push(const CallContext& ctx, const std::vector<Value>& args);
```

### Internal/Helper Methods

```cpp
/// NON-STANDARD: Internal helper to get array length from the "length" property.
static size_t getArrayLength(JSObject* obj);
```

### Internal Slots (Class-Level)

Document internal slots where they add architectural value:

```cpp
/// 27.2 Promise Objects
/// @spec https://tc39.es/ecma262/#sec-promise-objects
///
/// Internal slots (stored as properties):
/// - [[PromiseState]]: "pending" | "fulfilled" | "rejected"
/// - [[PromiseResult]]: fulfillment value or rejection reason
/// - [[PromiseFulfillReactions]]: Array of reaction records
/// - [[PromiseRejectReactions]]: Array of reaction records
class Promise : public BuiltinBase<Promise> {
```

---

## The `extractThisObject` / `extractThisNumber` Pattern

Almost every Rift builtin method starts by extracting `this`. In the spec, this is typically steps 1-2:

```cpp
    // 1. Let O be ? ToObject(this value).
    // SIMPLIFIED: Rift uses extractThisObject which combines ToObject + type check.
    auto* arrayObj = extractThisObject(ctx);
```

Note it on the first method in each file with a SIMPLIFIED tag — it's understood for the rest.

---

## Deviation Tags

Mark deviations from the spec explicitly using one of three tags:

### DEVIATION — Observable behavioral difference

```cpp
// DEVIATION: Rift uses string-keyed properties instead of integer indices.
// The spec uses mathematical integer keys but the behavior is equivalent.
```

### INCOMPLETE — Missing functionality

```cpp
// INCOMPLETE: Steps 4-6 (proxy/Symbol.species handling) not yet implemented.
// This affects subclassed arrays but not standard usage.
```

### SIMPLIFIED — Equivalent but structurally different

```cpp
// SIMPLIFIED: The spec calls Abstract Relational Comparison (7.2.13).
// Rift inlines the comparison here for primitive types only.
```

---

## Handling Specific Situations

### Method exists in Rift but not in spec

```cpp
// NON-STANDARD: This method is not part of ECMA-262.
// It exists for internal/debugging purposes.
```

### Spec method not yet implemented in Rift

```cpp
// TODO: 23.1.3.31 Array.prototype.toSorted ( compareFn )
// @spec https://tc39.es/ecma262/#sec-array.prototype.tosorted
// Not yet implemented.
```

### Code implements multiple spec algorithms in one function

```cpp
// Implements both:
// 7.2.14 Abstract Equality Comparison ( x, y )
// @spec https://tc39.es/ecma262/#sec-abstract-equality-comparison
// 7.2.15 Strict Equality Comparison ( x, y )
// @spec https://tc39.es/ecma262/#sec-strict-equality-comparison
```

### Spec uses abstract operations that Rift inlines

```cpp
// SIMPLIFIED: The spec calls ToObject (7.1.18) then LengthOfArrayLike (7.3.18).
// Rift extracts the this-object and reads .length directly.
auto* arrayObj = extractThisObject(ctx);
size_t length = getArrayLength(arrayObj);
```

### Implementation is spread across multiple Rift files

```cpp
// Array iteration methods are split across files:
// - array.cpp: constructor, static methods, Symbol.iterator
// - array_mutators.cpp: push, pop, shift, unshift, splice, reverse, sort
// - array_accessors.cpp: indexOf, slice, concat, join, includes
// - array_iterators.cpp: forEach, map, filter, reduce, find, every, some
```

### Host APIs (not ECMA-262)

```cpp
// Console API — not part of ECMA-262
// @spec https://console.spec.whatwg.org/#log
Value Console::log(const CallContext& ctx, const std::vector<Value>& args) {
```

---

## Keeping Comments Up to Date

Spec comments are only valuable if they stay accurate. When modifying an annotated method:

- **Update step comments** to match the new implementation
- **Remove INCOMPLETE tags** when missing steps are added
- **Update SIMPLIFIED/DEVIATION tags** when behavior changes
- **Add `@spec` tags** to any new methods

---

## Verification

After modifying annotated files, verify:

1. **Build succeeds:** `cd build && make -j$(sysctl -n hw.ncpu)`
2. **Custom tests pass:** `npm test`
3. **No unintended code changes:** `git diff` should show only comment changes
4. **`@spec` tags present:** `grep -c "@spec" <file>` should roughly match the number of methods

---

## Spec Section Quick Reference

| Rift File | Spec Chapter | Spec Section |
|-----------|-------------|-------------|
| `global/global.cpp` | 19 | Global Object |
| `object/object.cpp` | 20.1 | Object |
| `function/function.cpp` | 20.2 | Function |
| `boolean/boolean.cpp` | 20.3 | Boolean |
| `symbol/symbol.cpp` | 20.4 | Symbol |
| `error/*.cpp` | 20.5 | Error, NativeError |
| `number/number.cpp` | 21.1 | Number |
| `math/math.cpp` | 21.3 | Math |
| `string/string.cpp` | 22.1 | String |
| `regexp/regexp.cpp` | 22.2 | RegExp |
| `array/array*.cpp` | 23.1 | Array |
| `map/map.cpp` | 24.1 | Map |
| `set/set.cpp` | 24.2 | Set |
| `weakmap/weakmap.cpp` | 24.3 | WeakMap |
| `weakset/weakset.cpp` | 24.4 | WeakSet |
| `json/json.cpp` | 25.5 | JSON |
| `promise/promise.cpp` | 27.2 | Promise |
| `generator/*.cpp` | 27.5 | GeneratorFunction |
| `temporal/*.cpp` | Temporal Proposal | Temporal |
| `console/console.cpp` | (not ECMA-262) | WHATWG Console |
| `operation_handler.cpp` | 7, 13 | Abstract Operations, Operators |
| `expression_evaluator*.cpp` | 13 | Expressions |
| `statement_evaluator*.cpp` | 14 | Statements |
| `lexer.cpp` | 12 | Lexical Grammar |
| `parser*.cpp` | 13-15 | Syntactic Grammar |
