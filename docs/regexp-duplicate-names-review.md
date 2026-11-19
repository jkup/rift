# Duplicate named RegExp capture review

TS-450, 2026-11-11. Review only; runtime admission remains unchanged.

The [participation rule](https://tc39.es/ecma262/multipage/text-processing.html#sec-mightbothparticipate)
allows equal decoded names when a disjunction separates their group specifiers
into different alternatives. This is structural: a zero repetition count or a
negative assertion does not itself make conflicting names legal. A named
[backreference](https://tc39.es/ecma262/multipage/text-processing.html#sec-backreferencematcher)
selects the participating numbered capture; if none participated it matches the
empty string. At most one may participate. Result groups must preserve the
participating value when later same-name captures are undefined, and named
indices must retain identity with the selected numbered pair.

The pinned [engine262 exec implementation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExpPrototype.mts)
tracks names with participating captures while building results. It asserts that
later duplicates are undefined. Rift can preserve that invariant using its
existing numbered capture representation and a set of published matched names.

## Proposed integration

The parser currently stores ordered name/index metadata and rejects every
repeated name. Add a parser-local path of disjunction identities and alternative
numbers. Snapshot that path when reading a group specifier, before entering its
body. Two same-name snapshots are disjoint if a shared disjunction identity has
different alternative numbers. Check every earlier matching name, charging the
existing parser budget. Copy path entries so later alternatives cannot mutate
previous snapshots. Keep this validation metadata out of the runtime program.

Preserve the existing numeric backreference instruction and its cost. Add a
named-reference instruction carrying all matching numeric indices, collected
once during compilation. The matcher scans those indices with budget checks,
selects the one participating capture and uses the existing text comparison.
Reject multiple live same-name captures as an internal invariant violation.
Avoid allocating temporary arrays during matching. Repeat clearing and assertion
backtracking should continue to use existing numeric capture storage.

Exec should track matched names while visiting capture metadata in source order.
Write undefined properties for unmatched names, replace them when a later group
participates, and skip unmatched duplicates after a participating value. Apply
the same selection to the already-created index pairs. Preserve first-definition
property order, null prototypes, fresh results and special keys such as
__proto__. Decoded names from TS-449 provide equality; no normalization is added.

## Evidence and required acceptance

Twelve independent reference matches, seven syntax rejections and two integration
checks pass in build/review-regexp-duplicate-name-reference.mjs, recorded in
build/regexp-duplicate-name-reference.json. They cover both alternatives, forward
and unmatched references, empty captures, nested disjunctions, repetition,
lookahead, decoded Unicode names, replacement and index-pair identity.

Carry these assertions into both-host Rift tests. Add multi-name property order,
nonmatching/backtracking paths, parser/matcher budget stops and literal error
provenance. Preserve earlier rejected source bytes as positive or now-certified
negative cases. Require the existing numeric/backreference/lookahead/exec/
replacement/matchAll/split regressions, full Node and native static/coverage
checks before integration. Unicode matching and lookbehind remain separate gaps.
