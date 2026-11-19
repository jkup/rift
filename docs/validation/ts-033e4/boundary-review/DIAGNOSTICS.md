# Guard diagnostic correction — proposed only

Review of 751e40e found a contradiction: preserving inherited guards requires a profile read for diagnostic classification, while the proposal promised no context field reads before permit validation. The original tuple model's generic `permit` error did not satisfy the inherited exact messages. This correction changes only the proposal and adds evidence; the four prior passing probes and transcripts remain unchanged.

Choose the existing **profile-first order**, not a catch-and-relabel path. Read `context.realm.profile`; mismatch throws exactly `cross-profile callable invocation`. Same-profile legacy wrappers invoke raw code directly. Same-profile Script wrappers consume a complete exact permit or throw exactly `Script execution unavailable`. Boolean consume returns false without mutation on absent/used/mismatched permit; it does not inspect context fields, authorize based on profile, or catch unrelated exceptions. Only a full match sets used=true. Consumption remains before raw code.

No raw callback, tick, dispatch, or permit consumption occurs on an ordinary rejection. This is not a zero-read promise. Malformed host values and hostile property access are outside the trusted-host shape contract; they can throw a host property-access error or run host code while fields are read. No diagnostic or noninterference guarantee is claimed for those shapes. The same limitation already exists in the current Realm guard. Guest objects never become OperationContext through guest property operations.

## Inherited call-site review

Repository-wide searches for `invoke(`, `Script execution unavailable`, and `cross-profile callable invocation` in test/*.ts found these relevant contracts:

| Existing test | Required behavior | Disposition |
| --- | --- | --- |
| script-realm-bootstrap B14 | Script console.log, Function.prototype and Function.prototype.call with legacy context: cross-profile exact message; same-profile plain context: unavailable exact message; legacy builtin with Script context: cross-profile | Preserve all exact messages and order |
| script-realm-bootstrap B15 | Builtin from another Script Realm, direct call with plain Script context: unavailable | Same profile is insufficient authority; preserve |
| script-realm-bootstrap B16 | Legacy direct builtin invocation using a different legacy Realm's context preserves that context and exact result | Legacy path requires no permit and does not substitute context |
| script-function-materialization F11 | Direct Script Function.prototype.toString with setup context: unavailable | Preserve |
| script-restricted-properties guarded thrower control | Direct actual restricted thrower with setup context: unavailable; legacy evaluator calling Script thrower: cross-profile | Preserve; no raw thrower activation from plain context |
| script-realm-bootstrap B12/B13/B17, materialization legacy guard | Evaluator cross-profile calls reject before nested budget effects | Existing dispatcher guard outside this model remains unchanged |
| number-conversions direct calls and object-tostring direct call | Legacy raw tick/call completion identity | Legacy guard remains direct; no new permit or wrapping |
| script-realm-bootstrap B15 transfer guard | `cross-profile callable transfer` | Separate transfer check; unchanged |

This was a source review of all direct-invoke occurrences found by those searches, not a rerun of every inherited suite or proof of integrated E4 compatibility. Full inherited gates remain mandatory on implementation. No expected output or production guard was edited.

## New executable evidence

`diagnostics.ts` imports actual Rift Realm, Value, Builtin, OperationContext and Location types. It first calls the **unchanged production guards** on real console.log, Function.prototype, Function.prototype.call/toString, the actual restricted thrower, and custom same/foreign-Realm builtins to confirm profile/unavailable errors, plus a legacy cross-Realm direct positive. It then calls the separate proposed diagnostic guard model with literal expected messages. It does not activate production Script execution.

Model negatives cover missing permit, same-profile foreign context, copied context, cross-profile context, other wrapper, other receiver, equal-content different args array/location, wrong Realm tuple, consumed replay and stale return/throw state. Within a pending permit, each invalid neighbor is followed by the exact authorized call, proving failures did not consume it. A legacy direct call while the Script permit is pending also leaves it available. Raw invocation counts are literal; context tick/dispatch counters remain zero. Exact normal result identity and host sentinel identity survive authorized calls and cleanup.

The new guard's three literal output lines are retained in diagnostics-results.json and checked by the runner and verification script. The final run passed strict types, Node/native literal output, static-only compilation and separate coverage: **2314/2314 static statements, zero dynamic statements**. Old tuple-first dynamic evidence and tuple results remain unchanged.
