# Architecture and supported JavaScript

Rift is a JavaScript interpreter written in TypeScript. It parses source into a
syntax tree and walks that tree to execute it. The same implementation runs on
Node or compiles to a native executable with ScriptC. Readability comes first;
simpler code must still preserve JavaScript's behavior and evaluation order.

## Where to start reading

| File | Responsibility |
| --- | --- |
| `src/cli.ts` | File input, console output, exit codes and a fresh Realm for each run. |
| `src/script.ts` | Current host API: create a Script Realm, prepare source, execute and drain jobs. |
| `src/lexer.ts`, `src/parser.ts`, `src/syntax.ts` | Tokens, grammar and syntax trees. |
| `src/script-record.ts` | Parse and check a script before execution. |
| `src/script-execution.ts` | Create a session and evaluate a prepared script. |
| `src/script-execution-internal.ts` | Declarations, function creation and evaluation. |
| `src/script-associations.ts` | Validate parser/declaration identities before retaining executable state. |
| `src/script-continuation.ts` | Suspended generator and async execution frame types. |
| `src/host/` | Observation drivers, conformance controls and wire serialization for host tooling. |
| `src/script-environment.ts`, `src/global-environment.ts` | Bindings and scope lookup. |
| `src/realm.ts`, `src/runtime.ts`, `src/builtins/` | Guest values, objects and built-in operations. |
| `src/temporal/`, `src/builtins/temporal/` | ISO calendar arithmetic, Temporal objects and guest-facing methods. |
| `src/regexp/`, `src/builtins/regexp/` | Pattern types, parsing, matching and guest-facing RegExp methods. |
| `src/time-zone/` | Zone lookup, local-time resolution, recurrence rules and generated IANA tables. |
| `src/unicode/` | Generated identifier, property and case-fold tables. |

Generated tables retain their provenance and licenses under `docs/data/`. Their
exact paths are excluded from formatting; the surrounding handwritten modules
remain subject to the normal checks. Regenerate data with the tools under `tools/`.

Mutable guest state belongs to a Realm. Guest throw, return, break and continue
use completion records. Host exceptions indicate an implementation fault. I/O
stays in host entry points; guest execution never uses host eval, Function or vm.

Property access and conversion can call guest getters or functions. Operations
share an execution budget and must preserve the order of those effects.
Generators keep explicit suspended state. Promise reactions run at Rift's host
checkpoints, not on the host JavaScript engine's promise queue.

The execution module keeps record construction and its private authority keys
together. Association validation and continuation data are separate modules;
neither grants execution authority. Further extractions should preserve that
boundary and the native compiler's mutable-array identity constraints.

New hosts and CLI features use `script.ts`; see the [embedding example](usage.md#embedding).
The `legacy` and `script` profiles select Rift execution paths, not JavaScript
language versions. `new Realm(output)` retains the legacy default for older
callers; `createScriptRealm(output)` selects the current path explicitly.
The older `interpreter.ts`, `evaluator.ts` and observation path remain for earlier tests.
Observation implementation lives under `src/host/`; a compatibility serializer
re-export remains at `src/script-observation-json.ts` for a pinned historical fixture.
For a small builtin, read
`src/builtins/array-mutation.ts` and `test/array-mutation.ts`.

## Supported features and limits

Rift implements the areas below, with incomplete ECMAScript conformance. See the
[Test262 results by API and language area](test262.md) for measured passes and gaps.
“Implemented” describes available functionality, not a claim that every test passes.

| Area | Availability | Scope and limits |
| --- | --- | --- |
| Scripts and functions | Implemented | Strict/sloppy scripts, lexical scopes, loops, exceptions, destructuring, spread, optional chaining, closures, bounded eval and Function construction. |
| Classes | Implemented | Inheritance, private fields/methods, static blocks, super and new.target. |
| Generators and async | Implemented; async Test262 profile skipped | Generators, async functions, async generators and for-await-of. The corpus runner does not provide Test262 async completion or agents. |
| Core builtins | Implemented | Objects, arrays, Number, BigInt, strings, symbols, Map, Set (including algebra and relationship methods), iterators, JSON and Reflect. |
| Date and Temporal | Implemented within scope | Date defaults to UTC with selectable pinned IANA zones; Temporal supports ISO-calendar operations. |
| RegExp | Partial | Unicode mode, property escapes, backreferences, lookaround and scoped modifiers; no Unicode sets. |
| WeakMap and WeakSet | Partial | Patched native compiler typed weak storage; no weak symbol keys. |
| Modules and Intl | Unsupported | Explicitly skipped by the corpus runner. |
| WeakRef and FinalizationRegistry | Unsupported | Explicit feature skips in the corpus runner. |
| Shared memory and Atomics | Unsupported | Explicit feature skips; no agent/shared-memory services. |
| Browser and Node host APIs | Unavailable to guests | No DOM, browser event loop, filesystem, network or Node API. |

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
