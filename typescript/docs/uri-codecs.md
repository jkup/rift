# URI encoding and decoding

TS-124 adds encodeURI, encodeURIComponent, decodeURI and decodeURIComponent to
Script realms. They have ordinary writable/configurable, non-enumerable global
properties, length 1, and no construction capability. Legacy escape/unescape
and URL parsing are separate work.

The wrapper performs guest ToPrimitive with the string hint and ToString before
entering a host codec. Guest hooks, symbols and abrupt completions retain the
existing conversion path. Only host URIError is translated to a guest URIError
in the builtin's active Realm; other host failures remain implementation faults.

Input is charged one step per UTF-16 code unit before calling the indivisible
host codec. Encoding has at most nine output code units per input unit; decoding
cannot expand beyond input length. This bounds codec work and output relative to
the execution budget. Resource stops remain uncatchable and can precede malformed
input detection. The codecs consume strings, never guest source.

A focused probe verified all four primitives under pinned scriptc, including
reserved escapes, UTF-8, malformed encodings and lone surrogates: 14/14 statements
static and exact Node/native output agreement. Evidence is in
`build/uri-primitive-probe-*`. The semantic driver uses literal expected results
for reserved-character case preservation, code point boundaries, invalid UTF-8,
lone-surrogate encoding errors, raw UTF-16 decoding, conversion order, metadata,
foreign Realm errors and resource limits. An added test initially called the
unimplemented guest String.fromCharCode; it now supplies the literal expected
UTF-16 value from the host harness.

Sources consulted 2026-11-09:
[URI handling functions](https://tc39.es/ecma262/multipage/global-object.html#sec-uri-handling-functions),
[Encode](https://tc39.es/ecma262/multipage/global-object.html#sec-encode),
[Decode](https://tc39.es/ecma262/multipage/global-object.html#sec-decode),
and [V8 URI implementation](https://github.com/v8/v8/blob/main/src/strings/uri.cc).
The tested host primitive supplies UTF encoding/validation; Rift owns guest
conversion, errors and budgets. No engine source was copied.

Acceptance: 613/613 guest cases on each host, all 123 native entries passing
static build/coverage (7322/7322 statements in this driver), tooling 290/290,
runner 31/31 and ten probes. All 225 fixture results agree; 136 complete,
retaining all 135 previous completions and adding uri-encoding.js.
