# Bounded RegExp pattern parsing

The standalone parser handles non-Unicode patterns: literals and UTF-16 code units, dot, classes/ranges, basic character escapes, capturing/noncapturing groups, alternatives, anchors/word boundaries, and greedy/lazy quantifiers. It preserves capture numbering and each term's capture range for the matching machine's repeated-group resets. Empty alternatives and empty/inverted-empty classes remain explicit.

Malformed syntax and unsupported constructs are separate results. Proven errors include unmatched groups/classes, reversed ranges and invalid repetition. Lookaround, named/modifier groups, backreferences and legacy numeric/control escapes outside the admitted subset are unsupported, not falsely certified syntax errors. Incomplete brace expressions and malformed hexadecimal escapes retain their non-Unicode literal/identity behavior. Quantifier bounds beyond exact host integer representation remain unsupported.

Every consumed code unit charges the supplied operation context, including tentative brace parsing. Group nesting is capped at 128 with the existing parse-depth resource origin. Parsing performs no guest calls and does not use host RegExp. Resource completions propagate explicitly.

This slice introduces neither a guest RegExp constructor nor literal syntax. Those require the separately tested matching machine and object/protocol layer. Native focused evidence is 10139 static statements, zero dynamic, with 670 Node guests in the reviewed draft; canonical acceptance is tracked in TASKS.md.

Semantics follow [ECMAScript 2025 RegExp grammar](https://262.ecma-international.org/16.0/#sec-patterns) and its [non-Unicode extensions](https://262.ecma-international.org/16.0/#sec-regular-expressions-patterns). The matching-machine direction and rejected host-backend evidence are in [TS-168](validation/ts-168/README.md).
