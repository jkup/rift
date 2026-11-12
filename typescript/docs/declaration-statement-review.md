# Declarations in Statement positions

TS-493, 2026-11-12. The independent Node syntax review retains 144 inputs and
results under build/declaration-statement-review/. It covers eight positions
(while, do, for, for-in, for-of, if, else and labels), strict/sloppy modes,
async functions, generators, async generators and classes, with block-wrapped
neighbors and ordinary-function controls. Node accepts 67 and rejects 77.
Rift prepares the 64 block-wrapped cases and explicitly rejects the other 80
with parse.declaration-statement; no misclassification becomes a pass.

[Statement and Declaration grammar](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-ecmascript-language-statements-and-declarations)
separates declarations from bare Statement positions. Async functions belong to
HoistableDeclaration, so the existing lexical-declaration-statement rule should
not be reused for them. A while body requires a Statement even when its condition
is false. Adding braces admits a StatementListItem and therefore declarations.

[Annex B](https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-functiondeclarations-in-ifstatement-statement-clauses)
permits certain ordinary functions in sloppy if/else clauses; labelled functions
also have legacy rules. Three accepted Node controls remain explicitly unsupported
in Rift. Do not certify every parse.declaration-statement rejection as invalid.

The next bounded change should target async function declarations only, using a
new async-function-statement rule. A non-emitting audit must parse the complete
supported source, retain the original first diagnostic and reject unsupported
or resource-limited tails. Cover all supported branch positions and labels,
line breaks after async, block neighbors, nested functions, effect-free
preparation, and the unchanged pinned U02 bytes. Keep ordinary functions,
generators and classes outside that certification task. Add the rule coherently
to the producer and both closed Script decoders, with wrong-phase and unknown-rule
controls. Legacy/public planners and capability admission remain unchanged.

Evidence is diagnostic, Node-only, and does not establish new native support.
No semantic-core change is part of this review. The reference uses node --check
in independent subprocesses; Rift never delegates guest execution to Node.
