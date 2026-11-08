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

Acceptance pending.
