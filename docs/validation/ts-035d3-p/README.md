# TS-035D3-P evidence

Base f3672ee. Design-only candidate for coordinator actual and independent second
review. No production or old-test changes; no implementation/publication authority.

Run from the repository root:

```text
node typescript/docs/validation/ts-035d3-p/audit.mjs
node typescript/docs/validation/ts-035d3-p/freeze.mjs
node typescript/docs/validation/ts-035d3-p/verify.mjs
git diff --check
```

Observed 2026-11-05: audit 77 rows, four distinct-formal depth controls,
4739 protected tracked paths, 33 selected files / 60 variants all blocked.
Fixture expansion: 77 future rows, 26 eligible, 30 candidate pairs.
Verification: all 77 current outputs across six existing entry points match,
26 distinct-formal grammar/resource controls match literal rejection payloads,
16 inherited P01–P15/L06 sources unchanged, source/build hashes match, candidate
substring/location arithmetic and both runtime file bytes match. Diff check passes.

`sources.json` contains complete expanded literals; `future-matrix.json` contains
future expectations, not executed results. `current-audit.json` stores original
existing-build outcomes, source and JS artifact hashes, inherited counts and
blocked-variant evidence. `grammar-controls.json` contains separate current
distinct-formal probes; these are never candidate authority. `freeze.mjs` uses
explicitly chosen function fragments solely to expand editorial numeric offsets.
No alternate parser, evaluator, production patch or source-recovery audit exists.

`runtime-0.js` and `runtime-1.js` are evidence inputs for the future driver's
runtime-file tests; they were parsed only here. Non-BMP comment / CRLF bytes in
runtime-1 are intentional.
Fixture Git attributes preserve these bytes. The first staged diff check flagged
the intentional CRLF as trailing whitespace; the directory-local runtime-1
`whitespace=cr-at-eol` attribute resolved that check without changing input bytes.
Whole original S21 is read from the unchanged accepted
D-P pinned blob, Git-hashed against the manifest, then prefixed exactly as recorded.
Raw S21 is a separate sloppy duplicate veto row.

The 212 guest records / 65 static gates are inherited and preserved, not rerun.
No full build, typecheck, native execution, guest evaluation, reference-engine
execution, network fetch, new emission, corpus admission or conformance claim.
Existing evidence directories and C++ remain untouched. COORDINATION changes
belong to the coordinator and are excluded from this writer's commit.

Review focus: the private purpose must join structuralPlan **and** the bounded
identifier-delete deferral; collector formals already retain every token, so no
second formal map is needed. D1 audit's eligible block pair is a D3 veto. All
sloppy duplicates are checked before strict candidates can escape. Ordinary
purposes and accepted D2/legacy fallback do not opt into continuation.
