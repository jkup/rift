# RegExp lookbehind integration review

TS-530, 2026-11-13. This is a design and independent-reference review;
lookbehind remains unsupported in Rift. The Date CLI task retains implementation
priority. No frozen engine input changed during this review.

ECMAScript compiles a lookbehind body backward, reverses term evaluation within
each alternative, and preserves alternative priority. Captures still expose
ascending ranges. Backreferences consume input in the active direction; an
unmatched capture matches empty. Assertions choose their own direction, so a
lookahead nested inside lookbehind still looks forward. Positive assertions keep
their successful captures while restoring the input position; negative assertions
restore the entry state. See the [2025 matching algorithms](https://tc39.es/ecma262/2025/multipage/text-processing.html#sec-compileassertion).

[V8's implementation explanation](https://v8.dev/blog/regexp-lookbehind-assertions)
supports backward matching for variable-length bodies and explains why repeated
captures select the leftmost iteration. Fixed-length prefix scanning would not
provide the required semantics. The article is historical design context;
the retained Node subprocess results provide the measured reference behavior.

Nineteen controls have independently specified match values, UTF-16 indices and
capture ranges. They cover positive/negative assertions, empty bodies, variable
length, greedy/lazy capture selection, alternative priority, numeric references
before and after their group, nested assertion directions, anchors, surrogate
pairs versus code units, negative capture clearing and scoped ignore-case.
All agree with the installed Node reference. These are bounded reference controls,
not Rift test passes or comprehensive conformance evidence.

Source review identifies a contained extension of the current iterative matcher:

- Pass direction through compilation beside the scoped modifier flags. Compile
  each alternative's terms in the appropriate order without reversing the
  alternatives or allocating reversed copies of guest strings.
- Encode direction on consuming instructions, following the existing immutable
  per-instruction flag approach. Nested lookahead selects forward and nested
  lookbehind selects backward explicitly; neither merely toggles its parent.
- Keep capture numbering in source order. Backward groups save their end before
  the body and their start afterward, preserving the public range representation.
- Extend character and backreference reads to move over the preceding code point
  in Unicode mode and the preceding code unit otherwise. Keep cursor positions
  and exposed indices in UTF-16 units. Preserve per-read budget charges.
- Reuse assertion stack boundaries and capture/mark snapshots. Successful
  assertions must remain atomic, and exhausted negative assertions must restore
  their entry state. Keep repeat capture clearing and zero-progress guards.
- Distinguish named captures from `(?<=`/`(?<!` in the parser. Lookbehind cannot
  be quantified in either Unicode or non-Unicode mode; keep the separate legacy
  quantified-lookahead boundary explicit.

This mapping reviews both canonical source and the READY scoped-modifier
successor, which already moves flags onto consuming instructions. A later bounded
implementation must add syntax-error, atomicity, named-reference, protocol,
lastIndex, budget and both-host/native controls before public admission. It must
retain existing unsupported expectations and review their exact migrations.

Evidence: `build/regexp-lookbehind-review/results.json` retains the reference
process output, Node version, explicit expectations and hashes of both source
versions, cases and producer. `build/review-regexp-lookbehind.mjs` produced it.
