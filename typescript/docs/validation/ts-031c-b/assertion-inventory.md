# Before-edit assertion inventory

Base 802f595, inventoried before implementation on 2026-11-02.

- `test/structured-outcomes.ts`: P06 (`return 1;`), P37 (CRLF then
  return), P38 (U+2028/U+2029 then return) change only their expected
  unsupported-syntax/parse.return-context tag to syntax-error with parse phase,
  SyntaxError constructorName and return-outside-function ruleCode. The frozen
  sources, locations, diagnostic checks, boundary and no-binding checks remain.
  P34 has a late lexical operator failure and stays unchanged.
- `test/return-audit.ts`: replace the blanket rejection of every public
  syntax-error with an assertion that any emitted tag is the return rule and
  has complete, nonempty internal coverage at the original diagnostic location.
  Keep every EOF/span/order/state assertion and output unchanged.
- `tools/test262/observation.integration.mjs`: T21's non-strict `return 1;`
  and T01/T02/T03/T22/T24's strict-prefixed `return 1;` change only tag
  assertions. Keep source snapshot, metadata mutation, location, identity,
  harness, output and all other expectations.
- `tools/test262/driver-result.test.mjs`: existing rejection of the reserved
  assignment-target record remains. No old protocol case is removed.
- Historical `docs/validation/ts-031c-a/{run,metadata,preservation}.mjs` and
  TS-031C-P audits intentionally describe the non-emitting baseline. Do not
  edit or run them as current preservation gates. New baseline-aware audits
  reuse their literal cases and compare full results to base 802f595, allowing
  only the explicit complete-candidate return tag delta. Their saved evidence
  remains historical and unchanged.

The 212 guest result records do not encode the changed tag and must remain
byte-for-value identical. All 36 existing gate identities must remain. No
existing message, location, partial AST, resource count, execution result or
effect assertion is authorized to change.
