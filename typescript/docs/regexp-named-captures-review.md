# Named RegExp capture integration review

TS-445, 2026-11-11. No runtime feature is enabled by this review.

The current engine already executes numbered captures and backreferences.
`regexp-pattern-syntax.ts` rejects named groups and every `k` escape; its
capture-count scan excludes all groups beginning with `?`. Merely admitting
`(?<name>...)` would therefore miscount numeric references too. Keep the capture
scan and parser consistent before exposing syntax.

`RegExpProgram` retains numbered slots but no names. Extend its metadata with
ordered name/index records. Unique-name references can resolve to existing
numbered backreference instructions after parsing, including forward references.
This preserves the matcher's capture clearing, lookahead and backtracking paths.
Do not implement a separate capture store keyed by name.

The exec builtin already creates capture values and index pairs in numbered
order. It currently installs undefined for both groups properties. Use the
existing values and pair objects when adding named results. Replacement already
reads groups, passes them to callable replacements and supports named template
substitution through `string-substitution.ts`; validate that integration instead
of duplicating it. `GuestRegExp` carries the compiled program, so result metadata
need not become independent mutable object state.

## Semantic requirements

Names use decoded identifier code points, including Unicode escapes, even
without Unicode matching flags. Forward references must resolve. Named captures
retain numeric positions. Unmatched captures remain own properties with undefined
values. Groups objects have null prototypes; named indices share the corresponding
numbered pair objects. Missing named replacement properties produce empty text.
Duplicate names are valid in some disjoint alternatives; conflicting names are
syntax errors. A legacy `k` escape without named groups is distinct from a named
backreference. These requirements follow the [pattern grammar and early
errors](https://tc39.es/ecma262/multipage/text-processing.html#sec-patterns-static-semantics-early-errors)
and [RegExpBuiltinExec](https://tc39.es/ecma262/multipage/text-processing.html#sec-regexpbuiltinexec).

The pinned [engine262 implementation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExpPrototype.mts)
also derives named values from numbered capture results and tracks participating
duplicate names during result construction. This supports keeping Rift's existing
capture representation rather than adding another matching mechanism.

## Bounded sequence and acceptance

1. Add ordered capture metadata and unique ASCII names, with deferred reference
   resolution. Keep non-ASCII/escaped names and duplicate names explicitly
   unsupported until their separate validators are implemented; do not label
   valid-but-unimplemented input a certified syntax error. Include named groups
   in numeric capture counting. Preserve existing unsupported literal provenance.
2. Construct named exec and indices objects and exercise existing replacement,
   matchAll and split behavior. Test property order, null prototypes, __proto__,
   unmatched captures, pair identity and defining-Realm allocation. This is the
   first useful public increment; metadata alone should not admit syntax.
3. Add full name decoding/identifier validation against a reviewed Unicode
   backend. Do not borrow the unreviewed companion Unicode work or treat every
   non-ASCII code point as an identifier.
4. Add disjoint duplicate-name admission and references to multiple possible
   numbered slots. Review structural participation rules separately; do not
   approximate them by whether a particular input happened to match.

All scans, resolution loops and result construction need current resource-budget
checks. Retain the existing depth limit and static-only/zero-dynamic gates. Keep
lookbehind, Unicode matching and modifiers separate. Use uniformly typed arrays
where references share mutable storage (TS-444).

Thirteen independent Node 26.13.0 reference cases pass in
`build/review-regexp-named-reference.mjs`, recorded in
`build/regexp-named-reference-results.json`. They cover numbering, indices
identity, unmatched properties/references, forward references, repeat clearing,
lookahead, escaped/Unicode names, property safety, replacements, legal/illegal
duplicates and legacy k. These are reference evidence, not Rift acceptance tests.
Carry their assertions into both-host engine tests at the relevant increment.
