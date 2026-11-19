# String locale casing without Intl

Rift's non-Intl host uses a locale-neutral default for String casing, alongside
its existing deterministic Number and Date locale fallbacks. toLocaleLowerCase
and toLocaleUpperCase use the reviewed Unicode default casing backend. Reserved
locale/options arguments are ignored without property access or coercion.
Locale selection and ECMA-402 are not implemented.

The methods have distinct builtin identities and their own names, with length 0.
They share generic receiver conversion and casing with toLowerCase/toUpperCase;
replacing a public method does not affect another. Nullish and Symbol receivers
throw, conversion failures propagate unchanged, and errors use the defining Realm.

Tests cover expansions, contextual sigma, supplementary characters, lone
surrogates, ignored arguments, conversion order, method descriptors and Realm
ownership. The existing case-conversion boundary remains an atomic host operation
after normal guest entry/coercion guards; no new per-code-point quota is claimed.

References: ECMAScript [toLocaleLowerCase](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.tolocalelowercase)
and [toLocaleUpperCase](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.tolocaleuppercase),
consulted 2026-11-11, and the prior reviewed backend evidence in
docs/string-case-conversion.md and docs/string-locale-prerequisites.md.
localeCompare remains unsupported because the pinned backend fails canonical
equivalence checks. This change does not claim a complete locale subsystem.
