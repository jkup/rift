# BigInt locale fallback

BigInt.prototype owns toLocaleString with length 0 and the ordinary writable,
nonenumerable, configurable method descriptor. It requires a primitive or boxed
BigInt and reads its exact integer data without invoking an overridden toString
or valueOf. Reserved locale/options arguments are ignored.

Rift has no Intl implementation. This method deliberately selects the decimal
formatting fallback expressly permitted by ECMAScript 2025 section 21.2.3.2. It
does not claim locale grouping, localized digits, currency formatting or general
locale-sensitive string support. Those independent backend limitations remain.

Tests cover exact large values, branding, descriptors, ignored arguments,
overridden conversion hooks and cross-Realm error/allocation boundaries.
Reference: [BigInt.prototype.toLocaleString](https://262.ecma-international.org/16.0/#sec-bigint.prototype.tolocalestring).
