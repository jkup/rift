# Exact UTC offset grammar

The bounded scanner accepts ASCII signed hour, minute and optional second offsets,
with consistently basic or colon-separated fields. Seconds may have one through
nine fractional digits using a decimal point or comma. It returns exact signed
nanoseconds, including normalized negative zero, and rejects malformed or
out-of-range fields. Minute-only mode rejects all seconds forms.

Formatting accepts integral offsets within one day and emits normalized HH:MM
with a sign. This backend does not resolve named zones, parse dates, or invoke
host date/regular-expression parsing. Guest options and Instant parsing remain
separate work.

Fixed vectors cover every fractional precision, extreme and negative offsets,
malformed separators and suffixes. All 2,879 minute offsets round-trip. The full
Node suite passes 788/788; the focused native build and zero-dynamic gate pass.

Reference: [Temporal UTCOffset grammar](https://tc39.es/proposal-temporal/#prod-UTCOffset).
