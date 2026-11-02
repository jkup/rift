# Scope B acceptance mapping

Literal pure transport assertions are in `tools/test262/driver-result.test.mjs`.
Real driver/parent assertions are in `tools/test262/observation.integration.mjs`;
its lane loop executes both Node and native Rift. Semantic guest source is never
executed by the host JavaScript engine. Constructor-hook and diagnostic controls
use `test/observation-serialization.ts`, separately compiled and coverage-gated.

| ID | Assertions/evidence |
|---|---|
| T01 | Both lanes: parser normal, false body, empty stdout |
| T02 | Both lanes: body normal, true body, exact yes newline |
| T03 | Both lanes: success-shaped JSON stdout followed by real number throw; child file wins |
| T04 | Null child bytes with exit0 gives protocol |
| T05 | Truncated JSON, concatenated documents and trailing document give protocol |
| T06 | Repeated and escaped-equivalent driverVersion keys give protocol |
| T07 | Extra field, conformance mode, driverVersion2 rejected; missing fields also rejected |
| T08 | Wrong nonce/unit/mode rejected; a consumed actual plan cannot be relaunched |
| T09 | Normal child plus exit70 gives crash |
| T10 | Normal child plus deadline gives timeout; actual timeouts in both lanes |
| T11 | Signal/no child gives crash |
| T12 | Shared byte counter exactly1048576 has no crossing; valid record remains normal |
| T13 | Actual Buffer chunk raises count to1048600; later bytes do not change first crossing; real cap kills in both lanes |
| T14 | Deadline wins with cap fact present; cap count retained separately |
| T15 | Independent crashBeforeCap wins despite cap/normal child |
| T16 | 65537-byte child rejected as protocol, output count zero |
| T17 | Both lanes: missing input, short/extra argument lists, invalid mode exit70, stdout empty |
| T18 | Both lanes: each of steps/calls independently rejects -1, NaN, 1.5, 9007199254740992 and empty before output |
| T19 | Each fixed source/parse/evaluation cap mismatch rejected before creating attempt |
| T20 | Child identity/inputs/process/hash/classification fields rejected |
| T21 | Every Identity/Inputs field and individual limit bound by assertContext; every prepared field mutation rejected; asynchronous validation mutation rejected |
| T22 | Both lanes: strict return at2:1; original/transformed hashes differ; variant remains strict |
| T23 | Both lanes: exact quote, slash, backslash, CR/LF, NUL, separate lone high/low surrogates, pair and LS/PS diagnostic roundtrip; 1601 static statements |
| T24 | Non-strict parser observation accepted with false harnessValidated and no Classification |
| T25 | Existing conformance strict test-stage false harnessValidated rejected |
| T26 | Observation true harnessValidated or loaded harness rejected |
| T27 | appendAttempt rejects observation without mutating ledger; manually injected observation makes report reject; empty ledger pass count remains0 |
| T28 | Existing corpus integration 4/4 verifies both33-file60-variant plans, zero execution/pass and unchanged blockers |
| T29 | Child expectedNegative extra rejected; parent selection contains original metadata separately |
| T30 | Actual abort before close retains unfinished attempt with cancelled transport and no record |
| T31 | Regular stale result, junction result path, hardlink result alias and junction archive root rejected before launch; original bytes retained. File-symlink OS privilege denial retained separately |
| T32 | Effectful host property hook would throw/increment on constructor/name reads; actual body and serialization leave reads0, only body output, constructor unsupported in both lanes |
| V01 | audit.mjs compares all212 old names/expectations/actual records and preserves33 old gates;35 total |
| V02 | Baseline-built CLI comparisons for usage/file/-e/throw/parse and Node output-host-fault injection; cli.json |
| V03 | Typecheck,runner20,probes10,full rebuilt212 per lane,35 static/coverage gates,host71,observations14,corpus4 |
| V04 | inventory.json and callers.json regenerated; all existing producers/semantic sources unchanged by exact preservation audit |

C01–C08 remain non-emitting/unsupported. Existing A source and all its assertions
are unchanged; the full guest suites run them in both hosts.
