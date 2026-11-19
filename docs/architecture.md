# Architecture and supported JavaScript

Rift is a JavaScript interpreter written in TypeScript. It parses source into a
syntax tree and walks that tree to execute it. The same implementation runs on
Node or compiles to a native executable with ScriptC. Readability comes first;
simpler code must still preserve JavaScript's behavior and evaluation order.

## Where to start reading

| File | Responsibility |
| --- | --- |
| `src/cli.ts` | File input, console output, exit codes and a fresh Realm for each run. |
| `src/lexer.ts`, `src/parser.ts`, `src/syntax.ts` | Tokens, grammar and syntax trees. |
| `src/script-record.ts` | Parse and check a script before execution. |
| `src/script-execution.ts` | Create a session and evaluate a prepared script. |
| `src/script-execution-internal.ts` | Declarations, function creation and evaluation. |
| `src/script-environment.ts`, `src/global-environment.ts` | Bindings and scope lookup. |
| `src/realm.ts`, `src/runtime.ts`, `src/builtins/` | Guest values, objects and built-in operations. |

Mutable guest state belongs to a Realm. Guest throw, return, break and continue
use completion records. Host exceptions indicate an implementation fault. I/O
stays in host entry points; guest execution never uses host eval, Function or vm.

Property access and conversion can call guest getters or functions. Operations
share an execution budget and must preserve the order of those effects.
Generators keep explicit suspended state. Promise reactions run at Rift's host
checkpoints, not on the host JavaScript engine's promise queue.

New CLI features use the Script modules above. The older `interpreter.ts` and
observation path remain for earlier tests. For a small builtin, read
`src/builtins/array-mutation.ts` and `test/array-mutation.ts`.

## Supported features and limits

Rift supports strict and sloppy scripts, lexical scopes, loops, exceptions,
destructuring, spread, optional chaining, functions, closures and bounded eval
and Function construction. Classes include inheritance, private fields and
methods, static blocks, super and new.target. Generators, async functions,
async generators and for-await-of are implemented.

Builtins include ordinary objects, arrays, Number, BigInt, strings, symbols,
Map, Set, iterators, JSON, Reflect, Date and ISO-calendar Temporal operations.
RegExp supports Unicode mode, property escapes, backreferences, lookaround and
scoped modifiers. Date defaults to UTC; callers can select a pinned IANA zone.
WeakMap and WeakSet use the patched native compiler's typed weak storage.

This is incomplete ECMAScript support. Modules, Intl, RegExp Unicode sets,
WeakRef, FinalizationRegistry and weak symbol keys are unsupported. There is no
DOM, browser event loop, filesystem, network or Node API available to guests.
Source size, recursion, execution steps and some operations have explicit limits.
An unsupported operation or resource stop is distinct from a guest exception.

Known followups include native Number.toPrecision exponential formatting, eval
source tracking (`unregistered Script source`) and escaped class-name ranges
(`invalid class source range`). A passing Node test does not prove native behavior.

## Number formatting

The nondecimal formatter uses exact BigInt remainder and half-gap arithmetic,
based on Burger and Dybvig's [floating-point printing work](https://doi.org/10.1145/231379.231397).
It selects the shortest round-tripping representation, then the closest candidate,
using even whole-significand parity for ties. Candidate selection considers
adjacent radix exponents; the parity of the final digit is insufficient in odd
bases. The independent oracle and frozen inputs are tested by
`tools/test-number-radix.mjs`. The implementation was derived from the algorithm;
no paper listing or third-party engine code was copied.
