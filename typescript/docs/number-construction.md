# Number conversion and construction

TS-095 makes Script Number callable and constructible while preserving the legacy
namespace. Missing arguments yield positive zero; explicit undefined yields NaN.
Other values use the existing numeric-hint primitive conversion and numeric parser.
Calls return primitive numbers; construction converts first, then obtains the
prototype and allocates a genuine GuestNumber with a private numeric slot.
Foreign builtin ownership determines wrappers and conversion errors. BigInt is
not a supported Value kind and remains outside this task.

Number.prototype is linked to its constructor. Existing constants and isNaN /
isFinite behavior remain; isInteger and isSafeInteger reject non-number values
without invoking conversion hooks. Safe integers are integral finite numbers with
magnitude at most 2^53 - 1, including both zero signs. Parsing aliases and additional
formatters remain follow-up work.

References: [Number constructor and static methods](https://tc39.es/ecma262/2023/multipage/numbers-and-dates.html#sec-number-constructor)
and src/builtins/number/number.cpp at base d7587906. Rift's existing private number
slot is used instead of the C++ implementation's ordinary value property.
Tests cover primitive and boxed results, conversion order/errors, ignored extra
arguments, numeric hints, metadata, noncoercing predicates, Realm ownership,
slot identity and allocation budgets. Constructor authority remains enforced;
checks run through ordinary guest calls and construction.
