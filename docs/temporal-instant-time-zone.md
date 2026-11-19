# Instant string timezone conversion

Instant.toString uses the shared Temporal timezone conversion for supported UTC and fixed-offset identifiers, ISO strings carrying a timezone, and branded ZonedDateTime inputs. Branded inputs read slots without guest property access. Omitted timeZone retains the Z suffix; explicit UTC uses +00:00.

Options retain alphabetical reads and unit validation before timezone conversion. Exact instant rounding still precedes local offset projection. Invalid strings and unavailable named zones produce RangeError under the existing UTC/fixed-offset policy. The earlier Instant string test now checks that language error instead of its superseded unsupported-operation classification; the new suite covers the newly accepted ISO strings and branded inputs. No named-zone database or Intl implementation is claimed.

References: [Temporal.Instant.prototype.toString](https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tostring) and shared timezone conversion reviewed against engine262 revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1. Full Node, focused static-only native compilation with parsed zero-dynamic coverage, and timezone/Instant/ZonedDateTime regressions are required before integration.
