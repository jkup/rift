# Date locale fallback

TS-405 adds the three Date locale formatting methods. Rift does not implement ECMA-402: these methods use deterministic English date/time components and the engine's UTC timezone policy, ignoring reserved locales/options arguments. They read Date slots directly, preserve Invalid Date and throw intrinsic TypeError for incompatible receivers. This is fallback coverage, not locale-aware formatting or system-timezone support.

Tests cover exact output, invalid and boundary values, ignored arguments, bypassed guest formatting hooks, method metadata, branding and defining-Realm errors.

Reference: https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.prototype.tolocalestring
