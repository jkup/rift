# PlainDate string parsing

The ISO date parser accepts compact or extended dates, optionally followed by a
validated time and numeric offset. Time and zone annotations do not shift the
date. Z designators are rejected. The scanner retains the first calendar
annotation; ISO 8601 is supported, including critical annotations. Duplicate
critical calendar annotations and unknown critical keys remain errors.

Date range checks are intentionally separate: PlainDate.from must read overflow
options after parsing and before checking the representable date range. This
parser therefore accepts syntactically valid expanded dates outside that range.

The grammar follows [Temporal ISO parsing](https://tc39.es/proposal-temporal/#sec-temporal-parseisodatetime)
and engine262's DateParser/ParseISODateTime at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests include independent valid/invalid
forms, first-calendar behavior, expanded years and date round trips. Existing
Instant/PlainTime parser regressions are required; combined acceptance is pending.
