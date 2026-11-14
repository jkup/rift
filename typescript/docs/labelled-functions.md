# Labelled ordinary functions

TS-548 is an isolated candidate; native and canonical acceptance remain pending.

Ordinary functions can follow nested labels in sloppy statement lists. The
existing enclosing scope owns the declaration and original function source range.
Top-level functions are hoisted; block declarations reuse existing lexical and
Annex B copy rules, including lexical/parameter vetoes and skipped copies.
Strict labelled declarations, labelled async/generator declarations, and direct
label chains ending in functions in conditional or iteration slots reject.

The focused tests cover fourteen independently checked positive programs, twelve
syntax errors, defining-Realm allocation, current-caller resource limits, creator
session isolation, cleanup and source ownership. No original fixtures are changed.

Reference: https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-labelled-function-declarations
