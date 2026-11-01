# TS-004C validation and design record

Validated 2026-11-01 on Windows x64 using the pinned compiler contract. Work
started at `c95f60f`, preserving the coordinator tracking commit above approved
contract `51fb1f6`. Awaiting coordinator review; no successor work is started.

## Reproduction and results

From `typescript/`, with installed Zig 0.17.0 on PATH:

- `npm run typecheck`: passes (`typecheck.txt`).
- `npm run test:runner`: 20/20 (`runner.txt`).
- `npm run test:probes`: 10/10 in both lanes with static coverage (`probes.txt`).
- `npm run test:guest:node`: rebuilt, 131/131 (`guest-node.txt`).
- `npm run test:guest:native`: rebuilt, 131/131 (`guest-native.txt`).

All 130 previous cases are retained. The added compiled host program has throwing
assertions and a fixed success line; assertions are not counted individually as
conformance cases. Successful runs have no skips, crashes, timeouts or harness
failures. JSON files retain subprocess evidence. Both guest lanes were rebuilt
again after strengthening the inherited-value assertion during final review.

| Native entry | Static statements | Gate |
|---|---:|---|
| src/cli.ts | 785/785 | PASS |
| test/realms.ts | 850/850 | PASS |
| test/object-descriptors.ts | 250/250 | PASS |
| test/object-prototypes.ts | 857/857 | PASS |
| test/object-keys.ts | 294/294 | PASS |

Every entry passes static-only compilation and the separate fail-closed coverage
gate. No compiler workaround or toolchain change was needed. The initial sandbox
attempt could not locate Zig's installation libraries; `guest-native-initial.txt`
and `native-build-initial.json` retain that failure. The authorized escalated retry
succeeded. This environment failure is not counted as a skip or successful build.

## Expected-result coverage

The driver checks canonical indices at zero, decimal digit-length transitions,
both sides of the signed 32-bit boundary, and the maximum array index. Rejected
forms include the excluded upper bound, overflow, leading zeros, signs, whitespace,
fractions, exponents, radix notation, separators, non-ASCII digits, NUL and a lone
surrogate. Explicit lists establish numeric versus insertion order, including
nonenumerable keys, descriptor overwrites, numeric and string deletion/reinsertion.

Deletion checks include nonwritable configurable properties, nonconfigurable
rejection preserving descriptor and ordering, absent/repeated deletion, inherited
properties (including nonconfigurable ones), shadow removal exposing the inherited
value, and deletion on a nonextensible object followed by rejected reinsertion.
Snapshot tests cover mutation by the caller and later storage mutation. Separate
Realm Number namespaces demonstrate deletion, insertion and ordering isolation.

## Sources and decisions

Consulted 2026-11-01:

- ECMAScript 2025, 16th edition: [OrdinaryDelete §10.1.10.1](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarydelete),
  [OrdinaryOwnPropertyKeys §10.1.11.1](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryownpropertykeys),
  and [Object Type §6.1.7 (array index)](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-object-type).
- [engine262 objects.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/objects.mts),
  commit `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, source blob
  `3fce3dab52c171f0f08e39f0afcceafc0f501e21`, fetched through the GitHub connector.

The specification governs deletion using the own descriptor and key ordering by
index then creation time. engine262 similarly checks its own descriptor before
deleting, sorts indices with a numeric comparator, and scans storage order for
remaining strings and symbols. Rift uses direct ordinary storage and explicit
completion records rather than generator dispatch. It retains the parsed index
alongside each key so the comparator needs no repeated parsing. Source is original;
no upstream code was copied.

Bounded decimal parsing avoids guest coercion and host parsing permissiveness.
At most ten digits keep intermediate arithmetic exact; the maximum accepted value
is 4294967294. Map replacement retains creation order while delete/reinsert renews
it. A fresh returned list protects both storage and prior snapshots.

Only ordinary string-key objects are supported. No symbols, exotic dispatch,
accessors, guest reflection/delete syntax, arrays or coercion were added. The
classifier is a future array-storage dependency, not array implementation. Current
ordinary deletion cannot throw despite the frozen normal/throw result union;
ordinary key lists cannot throw. C++, Claude outputs, pins and coordinator-owned
COORDINATION.md are untouched.
