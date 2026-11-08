# String indexing and slicing

TS-069 adds generic `indexOf`. It converts the receiver, search value and position
in that order, with string/string/number hints. Omitted search values become
"undefined". Positions truncate and clamp to the string bounds; an empty needle
matches at that clamped position, including the end of an empty string. The
string backend searches UTF-16 code units, including lone surrogates and positions
within surrogate pairs. Conversion failures stop later effects.

The implementation follows [String.prototype.indexOf](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.indexof).
The C++ string builtin was consulted; its omitted-argument and empty-needle
shortcuts are not preserved. Tests cover conversions, metadata, primitives,
positions, UTF-16 and resource limits. Both guest suites pass 452/452, full tooling290/290, runner30 and probes10 pass. All 83 native entries pass build and static coverage in one invocation; string driver5008/5008 static. All 225 C++ fixture results agree across hosts: 61 reported successes, 29 unchecked completions, 58 parse errors, 75 runtime errors and two reported failures. The comprehensive template fixture now succeeds; all 89 previously successful or unchecked files retain their outcomes. Reports: build/legacy-suite-node-pAkUn1/report.json and build/legacy-suite-native-K6dnUg/report.json. Logs: build/string-index-*.

TS-054 adds generic `charAt`, `charCodeAt` and `slice`. They reject nullish
receivers, convert the receiver with a string hint, then convert positions with
a number hint. Conversion hooks run through the existing operation context;
abrupt completions and resource limits stop later effects.

All indexing uses UTF-16 code units. `charAt` returns one unit or an empty string;
`charCodeAt` returns its numeric code or NaN. Surrogate pairs can be split, and
lone surrogates are preserved. `slice` resolves negative indices from the end,
clamps bounds and defaults an undefined end to the captured string length.

The implementation follows ECMA-262
[charAt](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.charat),
[charCodeAt](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.charcodeat)
and [slice](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.slice),
checked against [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/StringPrototype.mts).
Existing host UTF-16 operations remain behind `strings.ts`; guest methods perform
their own conversions and bounds checks before using that boundary.

Tests cover surrogate pairs and lone units, missing/fractional/infinite positions,
generic receivers, overridden String-box conversion, Symbol rejection, conversion
ordering, failures and budgets. Bootstrap tests retain exact prototype metadata.
Node/native guest suites pass 317/317 each, full tooling 290/290, runner 27/27 and all ten compiler probes. All 75 native entries pass build and static coverage; the string driver covers 4340/4340 statements. Logs: build/string-methods-*.

The initial tooling run passed 287/290. Three regression fixtures incorrectly
required historical package identities after the build-runner change. Commit
`68c3b018` refreshes current input identities while preserving historical files,
behavioral assertions, migration controls and complete checkpoint records. The
subsequent full run passed all 290 (`build/string-methods-tooling-final.log`).
