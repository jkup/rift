# Scoped RegExp modifier review

TS-523 reviews scoped `i`, `m` and `s` modifiers against the
[ECMAScript pattern grammar](https://tc39.es/ecma262/multipage/text-processing.html#sec-patterns)
and [UpdateModifiers](https://tc39.es/ecma262/multipage/text-processing.html#sec-updatemodifiers).
The add/remove sets must contain no duplicates or shared letters. Both sets
cannot be empty when a hyphen is present. A nonempty add set followed by an
empty remove set is valid. Modifiers affect only their group and do not change
the public RegExp flags, Unicode mode, or capture numbering.

The retained review contains 145 controls: 124 valid JavaScript programs,
including caught invalid constructors, and 21 invalid literals. Every control
matches its independent expected result. Both current Rift hosts agree: two
ordinary noncapturing baselines execute; the remaining valid programs encounter
the unsupported modifier boundary. No valid source receives a false syntax
certificate. Evidence: `build/regexp-modifiers-review/results.json` and
`reviewed.json`.

Controls cover disjoint flag combinations with and without outer flags, unusual
valid ordering, empty removal, duplicate/overlapping flags, malformed prefixes,
nesting, restoration, alternation, repetition, classes, all four line terminators,
anchors, numeric/named backreferences, lookahead, Unicode case folding, word
boundaries, property complements, capture indices and public flag descriptors.
The original sources and both-host observation records are retained.

Nine C++ controls retain the existing executable's hash. The baseline and six
scoped cases agree with the expected booleans: enabling/disabling flags,
restoration, dotAll, multiline and nested scope all work. C++ also accepts
unscoped `(?i)` and repeated `(?ii:...)`, which these ECMAScript controls reject.
[RE2's syntax reference](https://github.com/google/re2/wiki/Syntax) documents
its broader modifier language. The executable's build revision is unknown;
these are observed binary results, not validation of a current-source build.

The current matcher reads three global flags while compiling and executing
instructions. A successor should pass effective flags down the compiler's
recursive traversal and attach the relevant values to consuming/assertion
instructions. This gives each backreference its own comparison mode and avoids
runtime flag mutation across backtracking or lookahead. Unicode mode stays
global. Capture reset ranges, compilation/matching budgets and existing simple
folding rules must remain intact.

Implementation needs its own task, meaningful semantic and budget tests, the
same 145 controls on both hosts, native static gates and full regression.
Preserve old rejection expectations for explicit migration review. Exclude
unscoped modifiers, lookbehind, Unicode sets mode and unrelated grammar.
