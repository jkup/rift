# Conditional function declarations

TS-547 is an isolated candidate. Native and full canonical acceptance are pending.

Ordinary function declarations in non-strict if branches receive explicit synthetic
block nodes. Their scope range is the original function range, without fabricated
brace tokens. Existing block initialization and Annex B copy rules handle branch
execution and lexical or parameter vetoes. Declaration planning rejects these
nodes in strict contexts before executable state is retained. Async, generator,
labelled and iteration-body declarations remain outside this admission path.

The focused driver covers fifteen independent positive outputs and seven syntax
errors, defining-Realm allocation, caller budgets, creator-session isolation,
resource cleanup and source/scope associations. A valid labelled-function Node
control is retained as a separate known gap.

Reference: [ECMAScript 2025 Annex B.3.3](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-functiondeclarations-in-ifstatement-statement-clauses).
