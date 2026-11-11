# Supported RegExp differential review

TS-476, 2026-11-11, integrated TypeScript commit `02989a2e`.

All 3,822 deterministic cases agree with an independent Node v26.13.0 reference
subprocess. The review compares first-exec captures (including unmatched groups),
match index and lastIndex across plain, global, Unicode and Unicode-ignore-case
flags. Inputs cover empty strings, line endings, lone surrogates, astral pairs,
long-s and Kelvin-sign folding. Patterns cover greedy/lazy and bounded repetition,
alternation, repeated/optional captures, backreferences, positive/negative
lookahead, anchors, word boundaries and character classes.

The reference subprocess uses Node RegExp explicitly. Node-hosted Rift executes
generated Script through its own parser and interpreter, in batches of 96 with
four-million-step and 64-call limits. No guest execution delegates to host RegExp.
All batches complete with exact result counts; there are no skipped cases.

This is a bounded differential review, not a new implementation or proof of full
RegExp correctness. It does not test unsupported lookbehind, property escapes or
v-mode, repeated exec sequences, replacement callbacks, every malformed pattern,
or native behavior. Existing expected-result and native acceptance gates remain
required. No runtime change was justified by these results.

Reproduction helpers and exact case/result data are retained under ignored build:

- `create-regexp-differential-cases.mjs`
- `reference-regexp-differential.mjs`
- `review-regexp-differential.mjs`
- `regexp-differential-cases.json`
- `regexp-differential-reference.json`
- `regexp-differential-results.json`
