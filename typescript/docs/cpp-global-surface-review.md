# C++ globals and remaining corpus review

This supplements the 525-entry builtin macro review. It inspects 47 literal
bindings in builtin_manager.cpp, global/global.cpp and json/json.cpp, nine
Temporal namespace entries, and four manually registered JSON/FinalizationRegistry
methods. Source locations and hashes are recorded. Node-hosted Rift and an
independent Node subprocess inspect own-property presence, kind, function name
and arity without invoking prototype getters.

| Classification | Entries |
| --- | ---: |
| Present in Rift and matching Node metadata | 51 |
| Missing weak constructors and finalization methods | 6 |
| C++ host GC hooks, absent in Rift and ordinary Node | 2 |
| C++ environment binding for `this`, not a global property | 1 |

The six missing entries are WeakMap, WeakSet, WeakRef, FinalizationRegistry and
its register/unregister methods. The [native prerequisite review](native-host-prerequisites.md)
records the pinned compiler blockers. C++ gc/gcStats invoke its collector and
statistics implementation; no-op replacements would not establish parity.
This audit finds no additional ordinary global or JSON method to implement.
It does not cover all constants, symbol keys, prototype inheritance, call/construct
semantics or native execution, and is not a conformance percentage.

The unchanged 225-record corpus still has 191 completions. Its other 34 records
are classified by the first observed failure:

| Reason | Records |
| --- | ---: |
| Weak-storage APIs absent | 7 |
| Nonstandard gc/gcStats hooks absent | 8 |
| Nonstandard createArray helper absent | 4 |
| Legacy Temporal calling/input assumptions | 9 |
| Invalid original syntax | 2 |
| Required or intentional runtime errors | 3 |
| Boxed-string enumeration expectations | 1 |

The last group expects strings to have no enumerable indices; Node reports the
same two assertion failures as Rift. The three runtime cases assign an invalid
array length, overwrite a hoisted function with a number before calling it, or
throw an uncaught string. The Temporal cases also fail in Node. All seven weak-API
fixtures complete in Node without reported failures. Those remain genuine gaps;
no fixture or expected assertion was changed to improve the count.

Reference execution used unmodified bytes through Node CommonJS stdin to avoid
the checkout's package module parsing. It is a bounded error review, not a full
Script-mode oracle. An initial ESM-mode run and its misleading duplicate-declaration
syntax error remain retained. Original snapshot hashes were verified before each
reference launch. Canonical foundation inputs were not modified.

Evidence: `build/cpp-global-surface-reviewed.json`,
`build/cpp-remaining-corpus-commonjs-reference.json` and
`build/cpp-remaining-corpus-classification.json`, with their producing scripts.
After the timezone milestones, prioritize a genuine static weak-storage/collector
boundary or targeted semantic audits of supported features. Do not add placeholder
GC APIs, strong-map substitutes, legacy Temporal exceptions or helper injection.
