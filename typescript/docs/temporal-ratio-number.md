# Temporal rational totals

Temporal totals require one correctly rounded conversion of an exact ratio. Converting each BigInt operand to Number before dividing can round twice: (9007199254740993 / 3) must produce 3002399751580331.

The helper locates the binary exponent, divides to a 53-bit significand and rounds the exact remainder to nearest, ties to even. Scaling that integer by a power of two is exact. Inputs are bounded by Temporal's time-duration magnitude, keeping every nonzero result normal and the loops bounded; zero returns positive zero. Subnormal/overflow handling is unnecessary in this domain.

Tests cover signed midpoint rounding, significand carry, fractional days, powers of two and the duration magnitude boundary. This helper supports the upcoming Duration.total implementation.

References: https://tc39.es/proposal-temporal/#sec-temporal-totaltimeduration and ECMAScript Number conversion of mathematical values.
