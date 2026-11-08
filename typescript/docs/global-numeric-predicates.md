# Global numeric predicates

TS-077 adds Script global isNaN and isFinite with standard writable,
non-enumerable, configurable properties and arity one. They convert their first
argument with a number hint before testing it. Extra arguments are ignored;
missing arguments become undefined. Conversion errors retain their identity and
use the existing Realm and resource machinery. Number.isNaN and Number.isFinite
remain non-coercing, and legacy globals stay unchanged.

This follows [isNaN](https://tc39.es/ecma262/multipage/global-object.html#sec-isnan-number)
and [isFinite](https://tc39.es/ecma262/multipage/global-object.html#sec-isfinite-number).
The C++ global functions were consulted. Tests cover primitive and object inputs,
conversion hints and order, abrupt values, Realm ownership, descriptors,
nonconstructibility, ignored extra arguments and budget boundaries.

Both guest suites pass 518/518, full tooling290/290, runner30 and probes10 pass. All 89 native entries pass build and static coverage in one invocation; predicate driver5070/5070 static. All 225 C++ fixture results agree across hosts: 67 reported successes, 30 unchecked completions, 53 parse errors, 73 runtime errors and two reported failures. All 97 previously successful or unchecked files retain their outcomes. The Math fixture reaches missing atan2. Reports: build/legacy-suite-node-rVVmDT/report.json and build/legacy-suite-native-vatwWb/report.json. Logs: build/global-numeric-*.
