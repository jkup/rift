# JavaScript support: Test262 snapshot

This is a measured companion to the [feature availability table](architecture.md#supported-features-and-limits).
It reports the full local Test262 corpus selection on **2026-11-20**, using Rift's
native Windows driver and its default skip policy. It is not a claim of complete
ECMAScript support or a measurement of the Node execution lane.

## At a glance

**63,328 / 103,352 records passed (61.27%).**
All 53,795 discovered test files were selected; ordinary tests
can produce strict and sloppy variants. Skips stay in the denominator.
Unknown-variant input files: **0**.

| Corpus area | Passing share (all variants) | Passed / total |
| --- | --- | ---: |
| annexB | ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱ 81.9% | 1,128 / 1,377 |
| built-ins | ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱ 72.3% | 34,300 / 47,453 |
| harness | ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱ 76.1% | 178 / 234 |
| intl402 | ▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱ 0.0% | 0 / 6,788 |
| language | ▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱ 58.5% | 26,166 / 44,709 |
| staging | ▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱ 55.8% | 1,556 / 2,791 |

Bars show the passing fraction, rounded to 5% steps; labels show exact counts.
Unfilled portions include all non-pass outcomes, including skips. The corpus also
contains staging/proposal tests; its overall percentage is not a stable score for
a particular ECMAScript edition.

| Outcome | Records | Share of all records |
| --- | ---: | ---: |
| skip | 21,413 | 20.72% |
| pass | 63,328 | 61.27% |
| unsupported | 8,164 | 7.90% |
| resource-limit | 1,174 | 1.14% |
| fail | 5,348 | 5.17% |
| harness-error | 3,902 | 3.78% |
| crash | 23 | 0.02% |

Pass means the expected result was met, including expected negative-test errors.
Fail means an attempted test did not meet its expectation. Unsupported means
execution explicitly rejected a capability. Skipped tests were not executed;
they do not establish either support or a semantic failure.

The report's exit code is **2**: infrastructure/driver errors occurred.
All selected records completed, but this is not a clean conformance run.
There were no input errors, timeouts, output-limit results or cancelled records.
Harness errors and crashes remain separate from semantic failures. Crash
classification includes unexpected driver exits, not only operating-system crashes.

## Time and reproducibility

| Measurement | Wall time |
| --- | --- |
| Total runner time, including discovery, preparation, build and execution | 979.8 seconds (16.33 minutes) |
| Native driver build and coverage check | 127.4 seconds (2.12 minutes) |
| Variant execution | 814.2 seconds (13.57 minutes) |
| Other setup and harness checks | 38.1 seconds (0.64 minutes) |

- Rift: [`5ede3955`](https://github.com/jkup/rift/commit/5ede39555a42db8ef7d54e1292933012889d62af), runtime source revision committed after validation.
- Test262: [`2e58f87d`](https://github.com/tc39/test262/commit/2e58f87d8350ad51224617a041c6e041d52f8444), existing clean corpus checkout.
- Windows 11 x64, Intel Core i7-13700K, 24 logical CPUs, Node v26.13.0; **8 workers**.
- Command: `npm run test262`; no filter; default feature skips; 10000 ms per-test deadline.
- Static-only build and separate zero-dynamic coverage gate, followed by assertion harness controls.

This is one run, not a benchmark average. Total is the runner's monotonic timer;
it excludes dependency/toolchain installation, Git fetch and final report serialization.
Machine load, filesystem and compiler setup affect repeat runs.
The [machine-readable snapshot](data/test262-summary.json) preserves exact counts,
limits, skip policy, revisions and the raw report hash. Full observations remain
in the local `build/test262-runs/run-YHJfL6/report.json` (not committed).

## Results by API

Pass / all includes skipped variants. A 100% row applies only to this corpus and
profile; a 0% row consisting of skips is untested. “Limits” combines resource,
wall-time and output limits. “Errors” combines input/harness errors, crashes and
cancelled records; exact categories remain separate in the overall counts and JSON.
Groups follow Test262 directory names, not a hand-curated list of supported APIs.

| Area | Pass / all | Pass | Fail | Skip | Unsupported | Limits | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| AbstractModuleSource | 0.0% | 0 | 0 | 8 | 0 | 0 | 0 |
| AggregateError | 88.0% | 44 | 4 | 2 | 0 | 0 | 0 |
| Array | 92.3% | 5,645 | 84 | 208 | 0 | 18 | 164 |
| ArrayBuffer | 0.0% | 0 | 376 | 56 | 0 | 0 | 10 |
| ArrayIteratorPrototype | 56.5% | 26 | 18 | 2 | 0 | 0 | 0 |
| AsyncDisposableStack | 0.0% | 0 | 148 | 60 | 0 | 0 | 0 |
| AsyncFromSyncIteratorPrototype | 2.6% | 2 | 0 | 74 | 0 | 0 | 0 |
| AsyncFunction | 94.4% | 34 | 0 | 2 | 0 | 0 | 0 |
| AsyncGeneratorFunction | 65.2% | 30 | 0 | 16 | 0 | 0 | 0 |
| AsyncGeneratorPrototype | 27.1% | 26 | 0 | 70 | 0 | 0 | 0 |
| AsyncIteratorPrototype | 30.8% | 8 | 10 | 8 | 0 | 0 | 0 |
| Atomics | 0.0% | 0 | 10 | 768 | 0 | 0 | 0 |
| BigInt | 93.5% | 144 | 4 | 2 | 0 | 4 | 0 |
| Boolean | 98.0% | 99 | 0 | 2 | 0 | 0 | 0 |
| DataView | 0.0% | 0 | 884 | 236 | 0 | 0 | 0 |
| Date | 99.5% | 1,214 | 0 | 6 | 0 | 0 | 0 |
| decodeURI | 70.9% | 78 | 0 | 0 | 0 | 32 | 0 |
| decodeURIComponent | 71.4% | 80 | 0 | 0 | 0 | 32 | 0 |
| DisposableStack | 0.0% | 0 | 184 | 2 | 0 | 0 | 0 |
| encodeURI | 77.4% | 48 | 0 | 0 | 0 | 14 | 0 |
| encodeURIComponent | 80.6% | 50 | 0 | 0 | 0 | 12 | 0 |
| Error | 59.1% | 110 | 66 | 10 | 0 | 0 | 0 |
| eval | 100.0% | 20 | 0 | 0 | 0 | 0 | 0 |
| FinalizationRegistry | 0.0% | 0 | 0 | 94 | 0 | 0 | 0 |
| Function | 89.0% | 795 | 51 | 26 | 17 | 2 | 2 |
| GeneratorFunction | 87.0% | 40 | 0 | 4 | 2 | 0 | 0 |
| GeneratorPrototype | 100.0% | 122 | 0 | 0 | 0 | 0 | 0 |
| global | 100.0% | 56 | 0 | 0 | 0 | 0 | 0 |
| Infinity | 100.0% | 10 | 0 | 0 | 0 | 0 | 0 |
| isFinite | 100.0% | 30 | 0 | 0 | 0 | 0 | 0 |
| isNaN | 100.0% | 30 | 0 | 0 | 0 | 0 | 0 |
| Iterator | 36.8% | 504 | 862 | 2 | 0 | 0 | 0 |
| JSON | 84.3% | 280 | 48 | 4 | 0 | 0 | 0 |
| Map | 99.0% | 401 | 0 | 4 | 0 | 0 | 0 |
| MapIteratorPrototype | 100.0% | 22 | 0 | 0 | 0 | 0 | 0 |
| Math | 94.5% | 618 | 30 | 0 | 0 | 6 | 0 |
| NaN | 100.0% | 10 | 0 | 0 | 0 | 0 | 0 |
| NativeErrors | 93.6% | 176 | 0 | 12 | 0 | 0 | 0 |
| Number | 99.4% | 676 | 2 | 2 | 0 | 0 | 0 |
| Object | 97.3% | 6,616 | 168 | 8 | 0 | 0 | 10 |
| parseFloat | 98.1% | 106 | 0 | 0 | 0 | 2 | 0 |
| parseInt | 94.5% | 104 | 0 | 0 | 0 | 6 | 0 |
| Promise | 37.4% | 546 | 84 | 828 | 0 | 0 | 0 |
| Proxy | 0.0% | 0 | 524 | 74 | 9 | 0 | 0 |
| Reflect | 93.5% | 286 | 20 | 0 | 0 | 0 | 0 |
| RegExp | 65.0% | 2,440 | 40 | 24 | 358 | 890 | 4 |
| RegExpStringIteratorPrototype | 100.0% | 34 | 0 | 0 | 0 | 0 | 0 |
| Set | 99.5% | 760 | 0 | 4 | 0 | 0 | 0 |
| SetIteratorPrototype | 100.0% | 22 | 0 | 0 | 0 | 0 | 0 |
| ShadowRealm | 0.0% | 0 | 114 | 10 | 0 | 0 | 0 |
| SharedArrayBuffer | 0.0% | 0 | 0 | 208 | 0 | 0 | 0 |
| String | 97.3% | 2,376 | 46 | 6 | 13 | 2 | 0 |
| StringIteratorPrototype | 100.0% | 14 | 0 | 0 | 0 | 0 | 0 |
| SuppressedError | 86.4% | 38 | 4 | 2 | 0 | 0 | 0 |
| Symbol | 81.3% | 156 | 2 | 34 | 0 | 0 | 0 |
| Temporal | 96.8% | 8,938 | 276 | 0 | 0 | 18 | 0 |
| ThrowTypeError | 85.7% | 24 | 2 | 2 | 0 | 0 | 0 |
| TypedArray | 0.0% | 0 | 32 | 280 | 0 | 0 | 2,578 |
| TypedArrayConstructors | 0.0% | 0 | 222 | 254 | 0 | 0 | 970 |
| Uint8Array | 0.0% | 0 | 124 | 8 | 0 | 0 | 8 |
| undefined | 100.0% | 12 | 0 | 0 | 0 | 0 | 0 |
| WeakMap | 87.5% | 246 | 0 | 2 | 0 | 0 | 33 |
| WeakRef | 0.0% | 0 | 0 | 58 | 0 | 0 | 0 |
| WeakSet | 90.6% | 154 | 0 | 2 | 0 | 0 | 14 |

## Results by language area

<details>
<summary>Expand language, Annex B, Intl, harness and staging details</summary>

| Area | Pass / all | Pass | Fail | Skip | Unsupported | Limits | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| annexB/built-ins | 72.2% | 348 | 84 | 32 | 12 | 6 | 0 |
| annexB/language | 87.2% | 780 | 2 | 71 | 42 | 0 | 0 |
| harness | 76.1% | 178 | 0 | 48 | 0 | 2 | 6 |
| intl402 | 0.0% | 0 | 0 | 44 | 0 | 0 | 0 |
| intl402/Array | 0.0% | 0 | 0 | 4 | 0 | 0 | 0 |
| intl402/BigInt | 0.0% | 0 | 0 | 22 | 0 | 0 | 0 |
| intl402/Collator | 0.0% | 0 | 0 | 130 | 0 | 0 | 0 |
| intl402/Date | 0.0% | 0 | 0 | 24 | 0 | 0 | 0 |
| intl402/DateTimeFormat | 0.0% | 0 | 0 | 492 | 0 | 0 | 0 |
| intl402/DisplayNames | 0.0% | 0 | 0 | 114 | 0 | 0 | 0 |
| intl402/DurationFormat | 0.0% | 0 | 0 | 220 | 0 | 0 | 0 |
| intl402/FallbackSymbol | 0.0% | 0 | 0 | 4 | 0 | 0 | 0 |
| intl402/Intl | 0.0% | 0 | 0 | 132 | 0 | 0 | 0 |
| intl402/ListFormat | 0.0% | 0 | 0 | 162 | 0 | 0 | 0 |
| intl402/Locale | 0.0% | 0 | 0 | 380 | 0 | 0 | 0 |
| intl402/Number | 0.0% | 0 | 0 | 14 | 0 | 0 | 0 |
| intl402/NumberFormat | 0.0% | 0 | 0 | 502 | 0 | 0 | 0 |
| intl402/PluralRules | 0.0% | 0 | 0 | 106 | 0 | 0 | 0 |
| intl402/RelativeTimeFormat | 0.0% | 0 | 0 | 160 | 0 | 0 | 0 |
| intl402/Segmenter | 0.0% | 0 | 0 | 158 | 0 | 0 | 0 |
| intl402/String | 0.0% | 0 | 0 | 38 | 0 | 0 | 0 |
| intl402/Temporal | 0.0% | 0 | 0 | 4,080 | 0 | 0 | 0 |
| intl402/TypedArray | 0.0% | 0 | 0 | 2 | 0 | 0 | 0 |
| arguments-object | 72.8% | 335 | 2 | 120 | 3 | 0 | 0 |
| asi | 65.7% | 134 | 0 | 0 | 70 | 0 | 0 |
| block-scope | 35.5% | 102 | 0 | 0 | 185 | 0 | 0 |
| comments | 37.0% | 30 | 0 | 1 | 46 | 4 | 0 |
| computed-property-names | 100.0% | 96 | 0 | 0 | 0 | 0 | 0 |
| destructuring | 91.9% | 34 | 0 | 0 | 1 | 0 | 2 |
| directive-prologue | 96.8% | 60 | 0 | 0 | 2 | 0 | 0 |
| eval-code | 46.7% | 212 | 136 | 54 | 51 | 0 | 1 |
| export | 0.0% | 0 | 0 | 3 | 0 | 0 | 0 |
| expressions | 0.0% | 0 | 0 | 0 | 0 | 1 | 0 |
| expressions/addition | 100.0% | 95 | 0 | 0 | 0 | 0 | 0 |
| expressions/array | 100.0% | 104 | 0 | 0 | 0 | 0 | 0 |
| expressions/arrow-function | 74.8% | 481 | 1 | 0 | 161 | 0 | 0 |
| expressions/assignment | 84.2% | 716 | 0 | 0 | 134 | 0 | 0 |
| expressions/assignmenttargettype | 2.7% | 17 | 0 | 6 | 604 | 0 | 0 |
| expressions/async-arrow-function | 7.3% | 8 | 0 | 46 | 56 | 0 | 0 |
| expressions/async-function | 3.7% | 6 | 0 | 88 | 67 | 0 | 0 |
| expressions/async-generator | 19.0% | 230 | 2 | 868 | 112 | 0 | 0 |
| expressions/await | 27.3% | 12 | 0 | 26 | 6 | 0 | 0 |
| expressions/bitwise-and | 100.0% | 59 | 0 | 0 | 0 | 0 | 0 |
| expressions/bitwise-not | 100.0% | 32 | 0 | 0 | 0 | 0 | 0 |
| expressions/bitwise-or | 100.0% | 59 | 0 | 0 | 0 | 0 | 0 |
| expressions/bitwise-xor | 100.0% | 59 | 0 | 0 | 0 | 0 | 0 |
| expressions/call | 93.0% | 159 | 0 | 1 | 6 | 5 | 0 |
| expressions/class | 61.2% | 4,976 | 34 | 2,176 | 939 | 0 | 2 |
| expressions/coalesce | 78.3% | 36 | 0 | 0 | 8 | 2 | 0 |
| expressions/comma | 90.9% | 10 | 0 | 0 | 0 | 1 | 0 |
| expressions/compound-assignment | 91.5% | 721 | 0 | 0 | 67 | 0 | 0 |
| expressions/concatenation | 100.0% | 10 | 0 | 0 | 0 | 0 | 0 |
| expressions/conditional | 85.7% | 36 | 0 | 0 | 4 | 2 | 0 |
| expressions/delete | 96.1% | 99 | 0 | 0 | 4 | 0 | 0 |
| expressions/division | 97.8% | 87 | 0 | 0 | 0 | 2 | 0 |
| expressions/does-not-equals | 100.0% | 75 | 0 | 0 | 0 | 0 | 0 |
| expressions/dynamic-import | 0.0% | 0 | 0 | 801 | 1,099 | 0 | 0 |
| expressions/equals | 100.0% | 93 | 0 | 0 | 0 | 0 | 0 |
| expressions/exponentiation | 84.1% | 74 | 0 | 0 | 14 | 0 | 0 |
| expressions/function | 87.2% | 422 | 1 | 0 | 61 | 0 | 0 |
| expressions/generators | 84.6% | 462 | 1 | 2 | 81 | 0 | 0 |
| expressions/greater-than | 100.0% | 97 | 0 | 0 | 0 | 0 | 0 |
| expressions/greater-than-or-equal | 100.0% | 85 | 0 | 0 | 0 | 0 | 0 |
| expressions/grouping | 100.0% | 16 | 0 | 0 | 0 | 0 | 0 |
| expressions/import.meta | 0.0% | 0 | 0 | 17 | 10 | 0 | 0 |
| expressions/in | 82.6% | 57 | 0 | 2 | 10 | 0 | 0 |
| expressions/instanceof | 100.0% | 85 | 0 | 0 | 0 | 0 | 0 |
| expressions/left-shift | 100.0% | 89 | 0 | 0 | 0 | 0 | 0 |
| expressions/less-than | 100.0% | 89 | 0 | 0 | 0 | 0 | 0 |
| expressions/less-than-or-equal | 100.0% | 93 | 0 | 0 | 0 | 0 | 0 |
| expressions/logical-and | 97.1% | 33 | 0 | 0 | 0 | 1 | 0 |
| expressions/logical-assignment | 91.3% | 126 | 0 | 0 | 12 | 0 | 0 |
| expressions/logical-not | 100.0% | 38 | 0 | 0 | 0 | 0 | 0 |
| expressions/logical-or | 97.1% | 33 | 0 | 0 | 0 | 1 | 0 |
| expressions/member-expression | 100.0% | 2 | 0 | 0 | 0 | 0 | 0 |
| expressions/modulus | 97.5% | 77 | 0 | 0 | 0 | 2 | 0 |
| expressions/multiplication | 97.5% | 77 | 0 | 0 | 0 | 2 | 0 |
| expressions/new | 91.5% | 108 | 0 | 2 | 8 | 0 | 0 |
| expressions/new.target | 78.6% | 22 | 0 | 2 | 4 | 0 | 0 |
| expressions/object | 66.7% | 1,502 | 15 | 458 | 277 | 0 | 0 |
| expressions/optional-chaining | 52.6% | 40 | 0 | 12 | 24 | 0 | 0 |
| expressions/postfix-decrement | 66.2% | 43 | 0 | 0 | 22 | 0 | 0 |
| expressions/postfix-increment | 65.2% | 43 | 0 | 0 | 23 | 0 | 0 |
| expressions/prefix-decrement | 74.1% | 43 | 0 | 0 | 15 | 0 | 0 |
| expressions/prefix-increment | 75.4% | 43 | 0 | 0 | 14 | 0 | 0 |
| expressions/property-accessors | 95.2% | 40 | 0 | 0 | 2 | 0 | 0 |
| expressions/relational | 100.0% | 2 | 0 | 0 | 0 | 0 | 0 |
| expressions/right-shift | 100.0% | 73 | 0 | 0 | 0 | 0 | 0 |
| expressions/strict-does-not-equals | 100.0% | 59 | 0 | 0 | 0 | 0 | 0 |
| expressions/strict-equals | 100.0% | 59 | 0 | 0 | 0 | 0 | 0 |
| expressions/subtraction | 100.0% | 75 | 0 | 0 | 0 | 0 | 0 |
| expressions/super | 98.9% | 182 | 0 | 2 | 0 | 0 | 0 |
| expressions/tagged-template | 91.7% | 44 | 0 | 2 | 0 | 2 | 0 |
| expressions/template-literal | 71.9% | 82 | 0 | 0 | 32 | 0 | 0 |
| expressions/this | 81.8% | 9 | 0 | 0 | 2 | 0 | 0 |
| expressions/typeof | 93.8% | 30 | 2 | 0 | 0 | 0 | 0 |
| expressions/unary-minus | 100.0% | 28 | 0 | 0 | 0 | 0 | 0 |
| expressions/unary-plus | 100.0% | 34 | 0 | 0 | 0 | 0 | 0 |
| expressions/unsigned-right-shift | 100.0% | 89 | 0 | 0 | 0 | 0 | 0 |
| expressions/void | 100.0% | 18 | 0 | 0 | 0 | 0 | 0 |
| expressions/yield | 89.4% | 110 | 4 | 0 | 9 | 0 | 0 |
| function-code | 100.0% | 281 | 0 | 0 | 0 | 0 | 0 |
| future-reserved-words | 81.2% | 69 | 0 | 0 | 16 | 0 | 0 |
| global-code | 45.3% | 34 | 0 | 25 | 16 | 0 | 0 |
| identifier-resolution | 68.2% | 15 | 0 | 0 | 7 | 0 | 0 |
| identifiers | 55.1% | 295 | 0 | 0 | 230 | 10 | 0 |
| import | 0.0% | 0 | 0 | 123 | 12 | 0 | 0 |
| keywords | 0.0% | 0 | 0 | 0 | 50 | 0 | 0 |
| line-terminators | 58.5% | 48 | 0 | 0 | 34 | 0 | 0 |
| literals | 80.0% | 833 | 0 | 0 | 200 | 6 | 2 |
| module-code | 0.3% | 2 | 0 | 600 | 0 | 0 | 0 |
| punctuators | 9.1% | 2 | 0 | 0 | 20 | 0 | 0 |
| reserved-words | 52.8% | 28 | 0 | 1 | 24 | 0 | 0 |
| rest-parameters | 90.9% | 20 | 0 | 0 | 2 | 0 | 0 |
| source-text | 100.0% | 2 | 0 | 0 | 0 | 0 | 0 |
| statementList | 100.0% | 160 | 0 | 0 | 0 | 0 | 0 |
| statements/async-function | 9.0% | 12 | 1 | 74 | 46 | 0 | 0 |
| statements/async-generator | 19.3% | 114 | 1 | 437 | 38 | 0 | 0 |
| statements/await-using | 0.0% | 0 | 0 | 133 | 55 | 0 | 0 |
| statements/block | 45.0% | 18 | 0 | 0 | 20 | 2 | 0 |
| statements/break | 40.0% | 16 | 0 | 0 | 24 | 0 | 0 |
| statements/class | 63.1% | 5,527 | 60 | 2,166 | 1,007 | 0 | 6 |
| statements/const | 81.2% | 220 | 0 | 0 | 51 | 0 | 0 |
| statements/continue | 45.8% | 22 | 0 | 0 | 26 | 0 | 0 |
| statements/debugger | 0.0% | 0 | 0 | 0 | 4 | 0 | 0 |
| statements/do-while | 57.1% | 40 | 0 | 0 | 29 | 1 | 0 |
| statements/empty | 100.0% | 4 | 0 | 0 | 0 | 0 | 0 |
| statements/expression | 66.7% | 4 | 0 | 0 | 2 | 0 | 0 |
| statements/for | 86.9% | 659 | 1 | 0 | 94 | 4 | 0 |
| statements/for-await-of | 0.2% | 4 | 0 | 2,395 | 32 | 0 | 0 |
| statements/for-in | 58.7% | 121 | 0 | 0 | 83 | 0 | 2 |
| statements/for-of | 85.6% | 1,235 | 42 | 4 | 151 | 0 | 10 |
| statements/function | 85.3% | 668 | 1 | 0 | 113 | 0 | 1 |
| statements/generators | 86.5% | 441 | 1 | 0 | 68 | 0 | 0 |
| statements/if | 52.8% | 66 | 1 | 0 | 56 | 2 | 0 |
| statements/labeled | 43.2% | 16 | 0 | 2 | 18 | 1 | 0 |
| statements/let | 89.5% | 257 | 1 | 0 | 29 | 0 | 0 |
| statements/return | 96.8% | 30 | 0 | 0 | 0 | 1 | 0 |
| statements/switch | 35.2% | 76 | 0 | 0 | 137 | 3 | 0 |
| statements/throw | 100.0% | 28 | 0 | 0 | 0 | 0 | 0 |
| statements/try | 85.1% | 330 | 0 | 0 | 55 | 3 | 0 |
| statements/using | 3.2% | 5 | 0 | 8 | 141 | 0 | 0 |
| statements/variable | 75.7% | 234 | 0 | 0 | 75 | 0 | 0 |
| statements/while | 58.3% | 42 | 1 | 0 | 28 | 1 | 0 |
| statements/with | 0.5% | 1 | 0 | 0 | 181 | 0 | 0 |
| types | 87.7% | 185 | 2 | 4 | 20 | 0 | 0 |
| white-space | 64.2% | 86 | 0 | 0 | 48 | 0 | 0 |
| staging | 100.0% | 8 | 0 | 0 | 0 | 0 | 0 |
| staging/built-ins | 50.0% | 8 | 2 | 6 | 0 | 0 | 0 |
| staging/decorators | 14.3% | 2 | 0 | 0 | 12 | 0 | 0 |
| staging/explicit-resource-management | 1.9% | 2 | 22 | 75 | 6 | 0 | 0 |
| staging/set-methods | 100.0% | 6 | 0 | 0 | 0 | 0 | 0 |
| staging/sm | 58.0% | 1,526 | 487 | 243 | 206 | 69 | 100 |
| staging/source-phase-imports | 0.0% | 0 | 0 | 4 | 0 | 0 | 0 |
| staging/Temporal | 100.0% | 4 | 0 | 0 | 0 | 0 | 0 |
| staging/top-level-await | 0.0% | 0 | 0 | 1 | 0 | 0 | 0 |
| staging/Uint8Array | 0.0% | 0 | 2 | 0 | 0 | 0 | 0 |

</details>

## Why tests were skipped

The async/module/host-service profile is narrower than Rift's implemented feature
set. In particular, async skips do not mean Rift lacks async functions. The host
service scan can also match comments and strings. See the [runner guide](../tools/test262/README.md).

| Recorded reason | Variants |
| --- | ---: |
| profile:async | 10,815 |
| profile:Intl | 6,788 |
| profile:test262-host-services | 1,635 |
| profile:module | 843 |
| feature:Atomics: agent and shared-memory services are not implemented | 588 |
| feature:SharedArrayBuffer: shared memory is not implemented | 480 |
| feature:FinalizationRegistry: finalization host jobs are not implemented | 96 |
| feature:IsHTMLDDA: the host does not provide IsHTMLDDA | 82 |
| feature:WeakRef: weak-reference host jobs are not implemented | 68 |
| profile:CanBlockIsTrue | 14 |
| profile:CanBlockIsFalse | 4 |

## Refreshing the snapshot

Run the full command from the [runner guide](../tools/test262/README.md), retaining
the corpus and Rift revisions. Read the resulting `report.json`; group each result
by `test/built-ins/<API>`, by `test/language/{expressions,statements}/<area>`,
or otherwise by up to the first two directories below `test/` (exclude filenames). Count every status,
including skips and unknown-variant input files, and replace this page and its JSON
snapshot together. Do not infer feature support from skips or a filtered run.
