# TS-035E3c implementation evidence

Base `8ad91c3`, accepted corrected design `5eb5389`. The only production additions
are the two complete files in the correction proposal manifest. Their SHA256s
remain `4fc40ed011acacc56f217d06949c9b9790f9cd1ffb2412294a0d6258e67d0547`
and `9a425e499463dba2beeb79fa8a1ddbd90143891454646e7e69b3f706836a85a1`.
There are no existing source/test replacements or policy closure changes.

This is input identity only: three public APIs, authentic E2 anchors and private
tokens, descriptor-first options copied before await, full ordered byte captures,
detached frozen inspection and sequential freshness checks. `executionBinding`
is null and admission remains blocked. No receipt, execution certification,
preflight authority, registry entry or admission grant is introduced.

## Fresh validation

`setup.json` records exact current-source copies and the retained accepted E3b
observation native binary identity. Installed tests run against byte-identical
installed files in that isolated tree. `context.mjs`, `root-mutant.mjs` and
`mutations.mjs` are fresh adapters of the accepted probes; only input/output
locations change, and they read installed source rather than proposals. Frozen
expected literals are consumed unchanged. The literal authoring tools were not run.

- Installed test: 17 complete capture comparisons, 94 controls, six actual
  records, four input-fault records, both lanes. Complete original anchors,
  Module and null-input denominator, repeated ordered includes and strict bytes
  remain covered. All actual corpus slots remain 60 blocked (19 feature, 41
  profile), executed/body-entry zero.
- Context: 10 checks, including closure/authority precedence, junctions and the
  explicit reduction showing that input identity does not certify helper source.
- Root constant-ID mutation: full installed test rejects at
  `capture-literal/node/success`, after successful capture.
- 13 whole-capture baselines; 55 installed-source mutants, 110 successful
  captures rejected by independent full literals. Full mutated outputs retained.
- E1: 133 tests. E2a: eight groups, 24 second-check traces and 11 projections.
- E2b: 149 controls and 28 reports; approved extended replay covers 338 controls,
  eight canonical reports, zero getters, three schema rejection/recovery cases
  and the complete 33-file all-null positive.
- E2c: 28 full checkpoint literals, 56 boundary checks, 11 selection migrations
  and four negative controls; 28 actual checkpoint/reopen literal replays with
  12 rewritten chains rejected; 22 fault controls, three resolve-fault scenarios
  with four repeated cleanup failures/three recoveries, four additional controls.
- Host 73/73, decoders 21/21, observations 22/22, runner 20/20, typecheck pass.
  No skips in these final suites. All 21 successful stages are retained alongside
  the initial failures, not substituted for them.

`retry-stages.json`, `remaining-stages.json`, `final-stages.json` and
`completion-stages.json` retain commands, working
directories and process statuses. Inherited E2c/host/decoder/observation/runner
and typecheck results are in their named transcripts. `inherited-artifacts.json.gz`
retains every new or changed evidence file from the isolated E1/E2 trees, excluding
duplicated node_modules; its index includes complete hashes and byte lengths.
Original historical files in the shared checkout are read-only throughout.

## Retained setup failures and approved adaptations

1. `installed.txt` / `stages.json`: initial sandbox hardlink EPERM in the alias
   control. Failed setup and corpus remain. Fresh elevated run passes; no skip,
   test change or production fallback.
2. `shared-node-closure-failure.txt`: shared generated Node output still contains
   the withdrawn unshipped request helper. No observation was launched against
   that tree. `prepare-observation.mjs` creates a separate fresh observation tree
   with accepted E3b generated output, excludes the stale helper by selecting
   the accepted directory, and verifies 534 copied files plus the retained native
   binary. `observation-setup.json` records identities. No old directory is
   restored/deleted and no compiler/build/probe is run.
3. `E2b-extended.txt`: unchanged historical runner reaches its stale four-export
   assertion. E2c already documented and independently approved this exact issue
   and the isolated migration `94434105b4a293214c8a145571c16ffc13fbf912990bbb4a56716bbb5cd4ee6e`.
   `approved-extended.mjs` uses that hash-guarded migration in a new replay. It
   bypasses only obsolete milestone preservation invocations; E3c's current
   implemented verifier checks preservation separately. No new oracle amendment.
4. The historical root schema review is copied unchanged to its intended `build`
   location before invocation; its relative imports require that location.
5. TypeScript's platform executable was identified and copied before typecheck.
   No compiler/package/pin changes.
6. `decoders21.txt` retains an initial native serializer startup failure. The
   missing binary was reduced to `ENOENT`; `serializer-dependency.json` records
   the accepted retained E3b binary hash and exact copy. The unchanged decoder
   suites are rerun with the complete dependency. No assertion or source change.
7. `observations22.txt` passes 21/22 before the separate observation serializer
   reports ENOENT. `observation-serializer-dependency.json` records its accepted
   binary hash and copy; the full unchanged 22-case suite uses a fresh output
   archive on rerun. These two missing serializer dependencies were runner setup
   omissions, not semantic/decoder failures, and are not concealed as passes.
8. `collection-failure.txt` retains a collection-only EISDIR from a fixture
   junction. The collector now records link targets separately in
   `inherited-links.json` without following them. All 457 regular artifact files
   are retained with bytes/hashes; source tests are unaffected.

The original constant-ID oracle failure, original 170 artifacts, corrected 238
artifacts and 7,480 protected files remain intact. Retained 212 guest cases per
lane and 71 static gates are prior accepted evidence, not rerun claims. No native
builds, probes, unchanged C transport suites or conformance child launches.

Read-only checks from `typescript`:

```powershell
node docs/validation/ts-035e3c-p/correction/verify.mjs --implemented
node docs/validation/ts-035e3c/verify.mjs
```

Runners use exclusive output files; do not rerun them over retained evidence.
This implementation stops for coordinator actual/independent validation and final
second acceptance. No publication or successor work is performed.

All validation processes finished. Sessions 40713, 68143, 89718 and 87024 retain
the described failed stages; session 18058 finished exit0 with final observation,
runner and typecheck passes. No active session remains. A progress-message tool
call to the coordinator was rejected by automatic approval review for missing
trusted user messaging authorization; no message was delivered through it.
