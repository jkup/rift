# Tested foundation profile

This inventory is a scope statement, not an ECMAScript conformance score.
Diagnostics reject unsupported syntax before executing any of the program.
Unsupported operand combinations fail at runtime; parsing an operator is not a
claim that all coercion cases are supported.

| Area | Supported | Explicit limits / deferred behavior |
|---|---|---|
| Lexing | ASCII identifiers including `$`/`_`; decimal integer/fraction literals starting with a digit; single/double quoted UTF-16 strings; space/tab/CR/LF; line/block comments | No identifier escapes/Unicode identifiers, radix/exponent/separator numbers, leading-zero integers, templates or regex. String escapes only quote, backslash, n/r/t. |
| Literals/values | number, string, boolean, null; undefined/NaN/Infinity bindings; ordinary object/function identity | No bigint or symbol. NaN uses strict-equality semantics; console renders signed zero as `0`. |
| Expressions | parentheses, numeric + - * / %, numeric < <= > >=, === !==, ! and numeric unary +/-; short-circuit &&/\|\|; assignment | String + string concatenates. Other arithmetic/coercion and string relational operations rejected. No loose equality, comma, ternary, bitwise, update, compound assignment or optional chaining. |
| Statements | semicolon-terminated expressions and let; blocks, if/else, while, function declarations, return, throw, unlabelled break/continue, empty statement | Semicolons required; no ASI, var/const, for/do, switch, try/catch/finally or labels. Declarations as if/while bodies require braces. Return/throw expressions cannot start on a later line. |
| Scope | Block lexical bindings, TDZ, mutable captured bindings, function hoisting in their declaration list, recursion, shadowing in nested blocks | One let binding per declaration. Duplicate names/parameters rejected, including function declarations sharing a parameter name. Global builtin names cannot be redeclared. Separate Script global environments and Annex B deferred. |
| Functions | Declarations and anonymous expressions, simple parameters, left-to-right argument effects, missing args undefined/excess args evaluated, return/fallthrough, own properties | No named function expressions, arrows, rest/default/destructuring parameters, constructors, classes, argument objects, generators/async. Strict-call profile regardless of directives; detached and top-level this are undefined. |
| Objects | Colon-valued literal entries with word/string keys; dot and computed string-key get/write; aliases; ordinary methods as function-valued properties; missing properties undefined | Own data properties only. No prototype inheritance, accessors, method shorthand, numeric/computed literal keys, spread, deletion or enumeration. Literal __proto__ rejected. Computed numeric keys and primitive property bases rejected. |
| Bootstrap | Per-realm console object and console.log; undefined/NaN/Infinity bindings | No other standard constructors or globals, eval, Function, filesystem or process in guest code. Console rendering is a host diagnostic convention, not guest ToString. |
| Errors | Parse locations, runtime locations, thrown guest values, ReferenceError/TypeError/RangeError diagnostics | Engine errors are string values plus diagnostic records, not Error instances. No guest catch syntax or stack traces. Across-run redeclaration fails at runtime before new declarations are installed. |
| Resources | Source, parser, step, call and frame bounds; independent realm state | No heap quota, suspension, jobs or security isolation guarantees; see architecture decisions. |

`test/fixtures/semantics.js`, `order.js`, `examples/counter.js`, and the realm driver
exercise successful behavior with fixed outputs. `test/cases.json` records fixed
source locations for representative errors. `tools/run-guests.mjs` also materializes
negative syntax, abrupt evaluation, CLI and resource-bound cases as runtime files.
Every fixture is tested by the same compiled interpreter in Node and native lanes.

Full descriptor/prototype semantics, arrays, coercion, broad builtins, modules,
Temporal, regex, async/generators, weak collections and optimization remain outside
TS-001. Existing C++ tests and test262 are not counted in the foundation test total.
