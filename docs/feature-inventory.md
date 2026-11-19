# Supported JavaScript

This overview groups implemented Script features and known limits; it does not
claim complete ECMAScript conformance. The [roadmap](development-roadmap.md)
records known followups and links to validation evidence.

| Area | Implemented behavior and boundaries |
| --- | --- |
| Scripts | Strict/sloppy execution, ordered standalone and classic-for var/let/const identifier and binding-pattern lists, lexical environments, loops, labels, exceptions, optional chaining and automatic semicolon insertion. Module loading is absent. |
| Functions | Ordinary and arrow functions, non-strict conditional and labelled function declarations with Annex B scope rules, parameter/binding patterns, rest/spread, closures, calls and construction, bounded direct/indirect eval and Function construction. |
| Classes | Inheritance, super and new.target, public/private fields, methods and accessors, static blocks and private-in checks. |
| Suspension | Generators, yield/delegation, async functions/arrows/methods, await, async generators and for-await-of. Catch binding patterns support suspended defaults and computed keys with TDZ and iterator cleanup. Promise jobs drain at explicit host checkpoints; there is no browser event loop or Node API layer. |
| Values and collections | Number, exact BigInt, strings and symbols; ordinary objects, sparse arrays with custom species construction and Realm-local unscopables, Map/Set, iterators, descriptors, JSON and Reflect operations. |
| Text and patterns | UTF-16 string operations, ordinary/tagged templates, Unicode identifiers and RegExp Unicode mode, property escapes, backreferences, lookahead and scoped modifiers. Positive and negative lookbehind and bounded wide Unicode range compilation are accepted; Unicode sets mode remains unsupported. |
| Date and Temporal | UTC-default Date with explicit Realm/CLI timezone selection, pinned IANA zones, local gap/fold resolution, and Temporal ISO-calendar operations. System timezone discovery, Intl and other calendars are absent. |
| Weak storage | Object/function-keyed WeakMap and WeakSet, including WeakMap upsert methods, use typed weak storage in the patched compiler. Weak symbol keys report explicit unsupported behavior; WeakRef and FinalizationRegistry remain unimplemented. |

Source, parser, execution-step, call-depth and operation-specific bounds remain enforced.
Unsupported syntax or operations and engine resource stops are distinguished from
guest-thrown errors. Passing an unsupported-input test means its rejection was
correct; it does not mean the feature is implemented.

The interpreter exposes no filesystem, network, DOM or Node globals to guests.
The CLI owns file input and console output. Native validation requires both
static-only compilation and a parsed zero-dynamic coverage report. See the
[compiler contract](compiler-contract.md), [eval design](design/eval-design.md),
[generator boundary](design/generator-boundary.md), [Date review](design/date-named-zone-review.md)
and [weak-storage evidence](design/native-host-prerequisites.md) for important limits.

Earlier milestone histories are available in Git at `150d2625:docs/feature-inventory.md`.
