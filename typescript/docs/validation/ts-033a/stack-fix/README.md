# TS-033A review correction: deep AST traversal

Independent review of `61220eb37b80547bc07a33b99b6ccdc519ff9cfe` found a
blocking host-stack overflow. `reproduction.log` retains the exact Node failure:
`'1' + '+1'.repeat(15000) + ';'` is 30002 UTF-16 units and the legacy parser
accepts it, but recursive metadata traversal throws RangeError. Parser recursive
depth does not bound the height of left-associated binary/member/call ASTs.

The collector now drains an explicit discriminated work stack. Each entry carries
its own strictness and syntactic parent. Statements and expression children are
pushed in reverse source order; functions emit metadata before pushing their body.
This preserves preorder, inherited strictness and sibling isolation without host
recursion. No new guard, rejection, grammar change or source-limit adjustment.
Storage grows with the finite source AST; no performance or arbitrary-memory
safety claim is made.

The same runtime-source driver has an explicit `summary` mode for stress cases:
it reports metadata, parse error and return audit without recursively serializing
the deep legacy AST. Default mode is unchanged and retains full AST/diagnostic
equality for the original 136-row matrix. Stress cases assert exact function
spans/order, own/inherited strictness and enclosing-function offsets using
independently constructed source segments, not parser-generated expectations.
Six cases cover 15000-link binary/member/call chains with strict/non-strict Script
contexts, a strict outer function, deeply buried first/nested functions, a final
operand/key/argument function and a sibling. A literal console side effect must
never run (stdout must be exactly the metadata JSON). Two more controls retain
the exact review reproduction and an accepted 100000-unit source boundary.

All original inputs and baseline/evidence records remain unchanged. The two
existing validation scripts accept an optional `RIFT_METADATA_EVIDENCE` output
directory so fresh results are retained here, without overwriting initial logs.
`audit.mjs` checks every field of the full original 136 metadata/parse/audit
records in both lanes, in addition to the original literal expectations.

From `typescript/`, with installed Zig access, rerun the usual full typecheck,
guest Node/native, runner, probes, host and observation suites. Direct evidence
output to this directory; for the matrices and preservation use PowerShell:

```
$env:RIFT_METADATA_EVIDENCE=(Resolve-Path docs/validation/ts-033a/stack-fix).Path
node docs/validation/ts-033a/validate.mjs node native
node docs/validation/ts-033a/stack-fix/stress.mjs node native
node docs/validation/ts-033a/preserve.mjs
node docs/validation/ts-033a/stack-fix/audit.mjs
```

No successor, parser/lexer/runtime changes, conformance admission or main merge.
This correction supersedes the initial robustness claim; the failing evidence
is retained. Stop for independent re-review after the tested commit/push.

Final validation: eight stress controls pass per lane, including 15000-link
chains and the 100000-unit source. All 136 full metadata/parse/audit records are
identical to the original commit per lane; all 42 literal controls remain green.
Full Node/native guest suites retain exactly 212/212 old records. All 38 native
static-only/separate-coverage gates pass; the updated driver is 500/500 static,
zero dynamic. Typecheck, runner20, probes10, host73 and observation16 pass without
skips. `preservation.json` records exact production/driver SHA-256 values and
the 37-old-plus-one gate preservation. No new failed validation attempt occurred
after the deliberately retained pre-fix reproduction.
