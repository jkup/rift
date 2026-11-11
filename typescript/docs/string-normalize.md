# String normalization

String.prototype.normalize converts its receiver first, then the optional form
with the string hint. Missing/undefined form means NFC. NFC, NFD, NFKC and NFKD
are accepted exactly; other converted strings throw RangeError even for empty
input. Conversion failures retain their identity and builtin errors use the
defining Realm. The method is generic, nonconstructible and has length 0.

Normalization uses the host string boundary validated in TS-440: all 20,034
Unicode 17 normalization rows and unchanged code points pass on Node/native,
totalling 4,788,784 checks with zero dynamic coverage. Guest tests cover canonical
and compatibility forms, combining-mark reordering, Hangul, lone surrogates,
coercion order, invalid forms and metadata. As with existing string case
conversion, the host operation is atomic after guest entry/conversion guards;
no per-code-point quota is claimed.

References: [ECMAScript normalize](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.normalize),
Unicode 17 NormalizationTest and the pinned engine262 StringPrototype.mts
at 18cdeb03c363eb31d775648a0d070bdc8a26ced1. See
docs/string-locale-prerequisites.md for provider evidence and input hash.
