# Second-review oracle correction

The original proposal at 2c23502 is not accepted. Second review identified that
T01/T02 selected E(11)/new E(11) for input-b but retained a shared expected message
"7", including maxCalls1. Review also identified T19's sourceTicks=3 despite its
two source events and absence of dispatch. Both were evidence defects; no B/C
implementation or execution was used to determine the correction.

The corrected frozen schema removes shared `expected` and terminal
`calls.maxCalls1.outcome` fields. Every trace has `expectedByInput`; terminal
prefixes, terminal maxCalls1 outcomes and sufficient-call expectations carry
explicit input-a/input-b literals. T01/T02 require message "7" and "11". The
eight payload-dependent hook/formatting traces require literal seven and eleven,
including "X: seven"/"X: eleven" and StringData seven/eleven. Unaffected traces
retain identical literal outcomes for both inputs. Resource call-limit outcomes
are unchanged. Sufficient expectations include explicit steps and effect strings.

Source-event counts are an explicit 21-entry table, not a source-text heuristic.
T19 is 2. The verifier independently identifies the leading source events in each
unchanged sequence and compares their count. All 21 event schedules, every prefix
counter/location/effect and both input source files are unchanged from 2c23502.

The verifier uses a separate literal table for the ten differing expectation
pairs, validates input identity/payload/number/source and runtime file contents,
and checks every expectation consumer. Ten in-memory mutations must fail:
repeated input-a source, swapped payload, restored shared terminal, repeated
input-a terminal, restored shared call outcome, repeated input-a call outcome,
repeated sufficient outcome, repeated prefix outcome, slash-ambiguous hook
outcome, and T19 source count3. These checks read no engine execution output.

Exact manifest, patch and all22 proposed file bytes are additionally compared to
2c23502. All94 replacements remain unchanged. Offline preservation still verifies
3896 protected files,139 old tests,70 direct helper calls,58 matrix rows,
328 prefixes per input and60 blocked variants. No full builds were repeated.

Reproduce with `node typescript/docs/validation/ts-034h6-bp/verify.mjs`.
The original defective evidence remains accessible in commit2c23502; no historical
evidence elsewhere was edited. This correction awaits actual and independent
second re-review. No implementation, publication or successor is authorized here.
