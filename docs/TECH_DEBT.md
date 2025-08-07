# Technical Debt – Rift JavaScript Engine

Last updated: August 2025

This document lists prioritized issues to address before adding more features. Items are grouped by correctness/spec compliance first, then architecture/quality of life.

## 🔴 High Priority – Correctness and Spec Compliance

- **Function call context and `this` binding (migration incomplete)**
  - Current behavior passes `this` as a positional first argument for method calls, and uses a magic string marker for constructors (`EvaluationConstants::CONSTRUCTOR_CALL_MARKER`). The new `CallContext` API exists but is not fully adopted.
  - Impact: User-defined methods do not receive a proper `this` binding via `CallContext`; constructor detection relies on a magic string.
  - Actions:
    - Remove magic string marker; propagate `CallContext` for both method and constructor calls end-to-end.
    - Bind `this` for user-defined functions when invoked as methods.
    - Update builtins to consume `CallContext` instead of positional `this`.

- **Control flow: continue semantics in loops (break implemented)**
  - `break` now works correctly in `while` and `for` (handled via `BreakException`). `continue` is not implemented.
  - Impact: `continue` in `while`/`for` is unsupported; labeled control flow not supported.
  - Actions:
    - Add `ContinueException` and handle in `while`/`for` evaluators.
    - Consider labeled `break`/`continue` as a follow-up.

- **Equality and comparison operators are not spec-accurate**
  - `==/!=` coercion rules are simplified; e.g., comparisons involving `null`/`undefined` and numbers are not spec-correct. Object comparisons use `toString()` rather than reference identity for `===`/`!==`.
  - Impact: Silent logic errors; deviates from ECMAScript abstract operations.
  - Actions:
    - Implement spec-compliant equality using ECMAScript abstract operations (SameValue, StrictEqualityComparison, Abstract Equality Comparison).
    - For objects in strict equality, compare identity (pointer) not string.

- **Scoping and declarations**
  - Lexer recognizes `let`/`const` but parser/evaluator only implement `var`. No block scoping, no TDZ, no hoisting semantics for declarations and function declarations are simplified.
  - Impact: Many spec tests for scope/TDZ/hoisting will fail; developer confusion.
  - Actions:
    - Add parser support for `let`/`const` and block environments.
    - Implement hoisting semantics for `var` and function declarations (declaration instantiation for function/blocks).

- **Template literals – advanced semantics**
  - Basic interpolation works, but there is no support for tagged templates, raw strings, or full escape handling nuances.
  - Actions: Add tagged template call path and raw template handling; verify escape sequences per spec.

- **Error types and exceptions**
  - Only base `Error` is implemented. Engine throws `std::runtime_error` in places where JavaScript errors (TypeError, ReferenceError, RangeError, etc.) should be thrown.
  - Actions: Implement core error types and replace engine-side throws with appropriate JS errors; surface via `JavaScriptException` consistently.

## 🟠 Medium Priority – Built-in Coverage and Usability

- **Array API completeness**
  - Missing common methods: `shift`, `unshift`, `splice`, `join`, `reverse`, `sort`, `find`, `findIndex`, `every`, `some`, `flat`, `flatMap`, `fill`, `copyWithin`, `from`, `of`.
  - Validate index/length semantics per spec for all mutators.

- **String API completeness**
  - Implement frequently used methods not present: `includes`, `startsWith`, `endsWith`, `repeat`, `padStart`, `padEnd`, `replace`, `replaceAll`, `match`, `matchAll`, `search`, `localeCompare`.

- **Object API and property descriptors**
  - Implement `Object.assign`, `create`, `getPrototypeOf`, `setPrototypeOf`, `defineProperty`, `defineProperties`, `getOwnPropertyDescriptor(s)`, `freeze`, `seal`, `preventExtensions`, and associated flags (enumerable/configurable/writable) via a descriptor model.
  - Current enumeration uses own-properties but there’s no descriptor system.

- **Number/Boolean/String wrapper semantics**
  - Wrapper objects exist in a minimal form. Ensure consistency with spec for `.valueOf()`, `.toString()`, and behavior when used as primitives vs objects.

- **Global API**
  - `Global::createArray` is a TODO and should be implemented or removed.
  - Consider adding `encodeURI/URIComponent` and `decodeURI/URIComponent` later.

- **Math API completeness**
  - A subset is implemented (`abs`, `floor`, `ceil`, `round`, `max`, `min`, `pow`, `sqrt`, `random`, `sign`, `trunc`, `sin`, `cos`, `tan`). Add remaining core functions (e.g., `exp`, `log`, `log10`, `log2`, `cbrt`, `hypot`, `clz32`, `imul`, `fround`, `atan`, `asin`, `acos`, hyperbolics, etc.).

## 🟡 Quality of Life – Architecture and Maintainability

- **Complete migration to `CallContext`**
  - Remove positional `this` convention and magic strings. Pass `CallContext` to all function invocations (user-defined and builtins) and update call sites accordingly.

- **Control-flow implementation strategy**
  - Unify control-flow via lightweight internal exceptions (`ReturnException`, `BreakException`, `ContinueException`) and ensure all relevant evaluators catch and handle them locally to avoid unexpected unwinds.

- **Operator dispatch and abstract operations**
  - `OperationHandler` uses string comparisons and simplified coercions. Extract an internal enum/token for operators and implement ECMAScript abstract operations (ToPrimitive, ToNumber, ToString, etc.) in one place.

- **Environment API behaviors**
  - `Environment::set` auto-defines in the current scope if not found. This diverges from JS assignment semantics (should throw in strict mode; in sloppy mode create global). Decide and document engine mode; adjust behavior or introduce strict-mode flag.

- **Switch-based AST dispatch**
  - Current large `switch` statements in evaluators are serviceable but grow with features. Consider a visitor or dispatch table later; low urgency.

- **Magic numbers and constants**
  - Array index validation uses hard-coded limits per spec (2^32-2). Factor these into named constants with brief spec references.

- **Consistent error surface**
  - Replace ad hoc `std::runtime_error` throws (e.g., in `Value::get*`) with JavaScript error plumbing where appropriate, or gate with internal asserts and keep external exceptions JS-typed.

## 🟢 Performance and Tooling

- **Formatting and static analysis**
  - Ensure CI regularly runs `format-check`, `cppcheck`, and `clang-tidy` and that new contributions are clean.

- **OperationHandler micro-opts**
  - If needed, replace string operator dispatch with tokenized enums for fewer comparisons in tight loops.

- **Logging**
  - `DEBUG_GC` guards are fine, but consider a simple logging macro/system to centralize runtime diagnostics without sprinkling `#ifdef`s.

## 📌 Small Cleanups

- Remove or implement `Global::createArray`.
- Eliminate the constructor magic marker constant.
- Audit dynamic_cast uses to ensure no null-deref paths; encapsulate into helpers.
- Normalize number/string formatting to better match JS (e.g., integer formatting without trailing `.0` where applicable). Full spec formatting is a stretch goal.

## ✅ Recently Addressed (to avoid duplicating work)

- Function expressions, `this` in object methods, `new` operator, try/catch, update (`++/--`), and template literal interpolation are implemented and working based on current code and tests.
- GC architecture: single-ownership with raw pointers managed by GC is intentional and correct for this project; do not replace with shared_ptr.
- Loop `break` semantics implemented for `while` and `for`; tests added: `test/while-break-test.js`, `test/for-break-test.js`.

## 🔭 Suggested Sequencing (before new features)

1) CallContext migration + `this` binding correctness
2) Loop `continue` semantics (and consider labeled control flow)
3) Equality/abstract operations correctness
4) let/const + block scoping groundwork
5) Fill high-impact built-in gaps (Array/String/Object core methods)

This sequencing maximizes spec-correctness and testability while minimizing future refactors.


