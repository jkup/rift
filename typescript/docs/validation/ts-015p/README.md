# TS-015P design evidence

2026-11-01, design chat `01a19919-ec56-7c02-9dec-ec2e5aa870eb`.
Audited base `f2fde9c6a4c29a720c3f2847b0d223c03dc158cd`, existing branch
`codex/primitive-computed-keys`, origin `https://github.com/jkup/rift.git`.

Deliverable: [array-length-context.md](../../array-length-context.md).
Read project AGENTS, project goals, compiler contract, task scope and prior
object-coercion integration design. Inspected runtime/array storage, evaluator
literal/reference consumers, map result definitions, Realm/Number bootstrap,
all affected caller/override sites and existing rejection assertions.

[caller-inventory.txt](caller-inventory.txt) retains the raw search output:

```powershell
rg -n '\b(defineOwnProperty|internalSet|setLength|define)\s*\(|\.set\(' typescript/src typescript/test
rg -n '^\s*(override )?(defineOwnProperty|internalSet|set|define)\(' typescript/src typescript/test
rg -l '\.define\(' typescript/src typescript/test
```

The first search includes host Map writes, which are not runtime migration
sites. The design classifies these and lists every actual semantic override,
direct consumer and setup helper. Follow-up review checked TS-014's `returned`
fixture default: 2.9 must be deliberately changed to 2 for positive array-length
storage assertions, with fractional rejection preserved separately.

Source inspection used the living ECMAScript ArraySetLength/ArrayCreate/array
Define and OrdinarySetWithOwnDescriptor algorithms and engine262 pinned revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, `array-objects.mts`.
Exact links and adoption decisions are in the design. A guessed engine262
`ordinary-objects.mts` fetch returned 404; no evidence is attributed to it.
Initial project-goals/compiler-contract reads used incorrect root-relative
paths; corrected reads used `typescript/docs/`. Neither issue blocked design.

Validation: `git diff --check` passes. Review confirms only the task claim/handoff,
new design and this evidence directory change. No implementation, test,
manifest, pin, historical evidence, C++, Claude or COORDINATION edits.
No isolated probe was needed: the proposal uses existing classes/completions;
its extracted method/static reachability must still be validated in the future
implementation batch. No compiler/native capability claim follows from prose.

No runtime suites were rerun for this documentation-only change. Baseline
161/161 on each host and 20 static gates are coordinator-accepted TS-014
evidence, not new TS-015P results. Typecheck, runner 20/20 and probes 10/10 are
likewise inherited evidence. Implementation acceptance remains pending separate
assignment and fresh validation; design is awaiting coordinator review.
