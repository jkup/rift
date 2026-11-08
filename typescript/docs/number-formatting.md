# Number decimal formatting

TS-097 installs Script toFixed, toExponential and toPrecision. Legacy Number
prototypes stay unchanged. Methods accept primitive numbers and genuine numeric
wrapper slots; they do not coerce arbitrary receivers. Digit arguments use the
numeric hint and ToIntegerOrInfinity. Missing precision returns ordinary numeric
string conversion; missing exponential digits selects the shortest representation.

Receiver validation precedes digit conversion. Conversion precedes nonfinite
returns, except the undefined-precision shortcut. toFixed validates the digit
range before returning NaN or infinity; the other two methods do so afterwards.
Finite formatting charges a step before entering the backend. At most 100 digits
are requested, and backend calls are atomic rather than individually metered.

The primitive formatting boundary lives in src/number-format.ts. The runtime-input
probe build/number-format-probe.* agrees across Node and native for halfway ties,
signed zero, small negative values, large exact integers, the 1e21 fixed-format
cutoff, subnormals, maximum finite numbers, exponent carry and precision cutoffs.
It also checks all three methods at 100 digits for 0.1. The corrected probe is
6/6 static with zero dynamic statements. The initial direct Number conversion
of runtime input reported a dynamic operation despite a fully-static headline;
its log is retained. Using the engine's typed string conversion boundary resolves
that probe issue. No engine dynamic fallback was introduced.

Literal expected-result tests cover representative rounding results and long
decimal expansions, every permitted digit count on zero, invalid ranges,
conversion order, receiver rejection, errors from foreign Realms, metadata,
resource budgets and the legacy surface. This is targeted backend evidence,
not exhaustive proof for all binary64 values.

References: ECMAScript 2023 [Number prototype methods](https://tc39.es/ecma262/2023/multipage/numbers-and-dates.html#sec-properties-of-the-number-prototype-object)
and src/builtins/number/number.cpp at 2f31d8bb. The C++ stream-based formatting
and coercion shortcuts were not adopted.
