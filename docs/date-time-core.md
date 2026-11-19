# Date time primitives

Date stores clipped integral epoch milliseconds, with NaN representing an invalid date. TimeClip accepts both endpoints of the 100-million-day range, truncates fractions and removes negative zero. Field decomposition reuses the exact ISO backend; Date months are zero-based and weekdays use Sunday zero.

MakeTime and MakeDate preserve the specification's floating-point operation order. They do not replace intermediate arithmetic with a single exact BigInt sum. MakeFullYear provides the constructor/UTC two-digit-year rule separately from setters.

Tests cover negative milliseconds, leap dates, full endpoints, clipping and nonfinite inputs. No guest Date API is enabled here. The engine's default timezone is UTC, as recorded in date-host-review.md.

References: https://tc39.es/ecma262/#sec-date-objects and engine262 abstract-ops/date-objects.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
