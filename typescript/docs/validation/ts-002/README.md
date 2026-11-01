# TS-002 conditional-expression evidence

Validated on 2026-11-01, Windows x64, using the existing pinned toolchain.
Base checkout: `d7e3019`. Implementation is complete and awaiting coordinator review.
The commit containing this evidence identifies the tested implementation.

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run test:runner` | 20/20 pass |
| `npm run test:probes` | 10/10 pass, static coverage and expected exits/output |
| `npm run test:guest:node` | 112/112 pass, no skips |
| `npm run test:guest:native` | Rebuilt both binaries; 112/112 pass, no skips |

Native builds used static-only plus the existing independent coverage gate:
CLI 657/657 and realm driver 670/670 statements static. Zig 0.17.0 was added
to process PATH; native commands used approved access to its installed libraries.
No compiler workaround, toolchain update or dynamic fallback was introduced.

The adjacent JSON files retain guest expected/actual output, diagnostic, status,
signal and harness results, native build/coverage output, and all probe transcripts.
TS-001 evidence is unchanged. The new cases add one successful fixture with many
fixed outputs and 21 generated success/error/bound cases; the prior 90 remain.
One initially miscounted expected source column was corrected from 29 to 30
before the successful full runs; no implementation failure was suppressed.

## Design and sources

Consulted [ECMAScript conditional grammar and evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-conditional-operator)
and [V8 ParserBase, ParseConditionalExpression](https://github.com/v8/v8/blob/main/src/parsing/parser-base.h)
(main source viewed on 2026-11-01). Both inform the grammar boundary: the test
uses logical-expression precedence and both arms accept assignments. Rift keeps
its existing precedence-climbing parser and recursively parses both arms at
assignment precedence, yielding right association. No V8 code was copied.

Evaluation follows the spec's test-value conversion and selected-arm-only path.
Rift's existing `evaluate` already resolves references and returns explicit
completions; the new case propagates test failure and returns the chosen arm's
completion. Choosing a method therefore produces a detached function value,
which is tested in both arms. Existing `truthy` handles every current value kind.

The parser's 128 nesting bound and evaluator's 256 frame bound are unchanged.
Tests include a successful 30-level alternate chain, over-limit chains in both
arms (including an unchosen arm), and an evaluation-depth failure. Malformed
unchosen arms still fail before execution. Broader syntax, coercion, ASI, optional
chaining, nullish coalescing and comma expressions remain out of scope.

No new follow-up task was required. TS-003 and other backlog work remain for
coordinator assignment after review.
