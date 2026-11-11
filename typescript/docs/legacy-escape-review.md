# Legacy escape and unescape review

TS-472, 2026-11-11. Reference review; implementation waits for Reflect.apply's
native regression gates. C++ registers both globals in
[global.cpp](../../src/builtins/global/global.cpp); TypeScript's URI scope
explicitly excludes them.

Follow [escape](https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-escape-string)
and [unescape](https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-unescape-string).
Convert the guest argument to a string before processing UTF-16 code units.
Encoding preserves ASCII letters, digits and `@*_+-./`; other units use uppercase
two-digit percent escapes or four-digit `%u` escapes. Encode surrogate halves
independently. Decoding preserves malformed escapes and accepts lowercase `u`
only; hexadecimal digits may use either case. Decoded percent text is not
processed again. These operations do not perform UTF-8 URI conversion.

Use the existing guest conversion path, explicit code-unit operations and a
small hexadecimal decoder. Charge each scanned unit before appending output;
encoding expands by at most six units per input unit. Preserve foreign-Realm
errors, exact abrupt values, metadata and non-constructibility. Keep the existing
URI functions unchanged. No C++ source is copied.

Independent Node reference programs are retained in
`build/review-legacy-escape-reference.mjs`. Add both-host semantic, coercion,
surrogate, malformed-input and budget tests before integration.

All 25 independent Node reference cases pass, including malformed sequences and lone surrogates. The initial punctuation reference escaped a quote without including the intended backslash; that source is retained separately, and backslash encoding now has its own explicit code-unit case.

