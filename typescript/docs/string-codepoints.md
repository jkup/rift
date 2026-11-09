# String code-point access and construction

TS-136 adds Script String.fromCharCode, String.fromCodePoint and String.prototype.codePointAt. Construction converts arguments in order, charges each argument and joins once. fromCharCode truncates and wraps to a UTF-16 unit; fromCodePoint rejects nonintegral or out-of-range numbers and encodes supplementary points as surrogate pairs. Surrogate code points themselves remain valid inputs.

codePointAt converts its receiver before its index, uses UTF-16 unit indices and combines only a valid high/low pair. It returns undefined out of bounds and the unchanged code unit for an unpaired surrogate or a low-surrogate index. All three methods preserve builtin metadata, nonconstructability and defining-Realm errors. Legacy bootstrap is unchanged.

References consulted 2026-11-09: ECMAScript [fromCharCode](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.fromcharcode), [fromCodePoint](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.fromcodepoint) and [codePointAt](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.codepointat), and V8 [StringFromCodePoint](https://github.com/v8/v8/blob/main/src/builtins/builtins-string.cc). Rift follows ordered conversion and UTF-16 encoding with its existing host-string boundary, without V8's representation-specific allocation paths.

Acceptance pending.
