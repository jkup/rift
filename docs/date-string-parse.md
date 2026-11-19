# Date string round trips

The Date parser accepts the required ISO format and the engine's own UTC/full display formats. Those display forms preserve zero-millisecond round trips across the entire clipped range, including negative and expanded years. The parser uses bounded token counts and the ISO/calendar backend; it does not call host Date.parse or execute a regular expression.

Other implementation-specific legacy formats return NaN. The display parser recognizes the engine's explicit UTC suffix rather than interpreting arbitrary named timezones. Tests cover all three required output formats, endpoints, malformed fields/suffixes and whole-second display precision.

Reference: https://tc39.es/ecma262/#sec-date.parse.
