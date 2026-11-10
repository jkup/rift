# Suspended update targets

Prefix and postfix updates retain a member base while its key suspends. The
completed reference enters the same read/coercion/write helper as ordinary
updates. Converted keys are cached by the reference; descriptors and setters are
looked up for the write. Prefix returns the new number and postfix the old number.

Tests cover both operators and result forms, numeric conversion, signed zero,
NaN, symbols, getters, changing setters, strict errors and abrupt cleanup. Async
bodies, cross-Realm errors and current-session coercion limits run. The original
rejected update target now executes. See [ECMA-262 update expressions](https://262.ecma-international.org/16.0/#sec-update-expressions).

Super targets remain separate. Evidence stays under ignored build/generator-update-*
paths pending combined canonical acceptance.
