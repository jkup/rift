# TS-035D-P evidence

Design-only candidate at base b6aeb21356e47a723b982959e4161f3e187e3ac7.
Run from repository root:

```powershell
node typescript/docs/validation/ts-035d-p/audit.mjs
git diff --check
```

The script checks all protected tracked paths against base, hashes inspected
source and the existing Node artifacts, verifies pinned S21/S22 Git blobs,
expands the exact literal matrix and performs bounded existing-build parsing.
It runs no guest body, host eval/Function/vm, native executable, compiler, full
suite, launcher, harness, registry or conformance operation. Existing build
observations are labeled as such, not a claim of a fresh source build. Source
inspection independently establishes the recorded collector control-flow issue.

`cases.mjs` stores future expectations; `audit.json.current` stores actual
existing-build outcomes. `parameter` means future parameter-only audit eligible,
not block-only eligibility. No future algorithm is implemented here. The exact
long source-limit and nesting inputs are expanded in audit.json for review.
`pinned.json` retains original fetched upstream text and blob IDs with source
URLs, including original copyright/license notices. Test262 is BSD licensed;
see its [pinned license](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/LICENSE).

The strongest uncertainty reduction is B15: an earlier function conflict
precedes a later catch restriction in the current collector. B21 similarly
prevents treating the collector's first duplicate pair as a complete conflict
inventory. Neither is an existing certification bug: C emits unsupported today.
The design requires a separate global veto pass and complete conflict scan.

Two audit-script setup failures occurred before the first successful probe run:
(1) passing all 4596 protected paths as git arguments exceeded Windows command
length (`spawnSync git ENAMETOOLONG`); fixed by filtering the single complete
changed-path list; (2) manifest entries lacked `locale`, causing blockers to
throw; fixed by using the established metadata defaults from TS035P. These are
evidence-script failures, not production or compiler failures. No evidence from
either failed attempt is treated as a passing probe.

Preservation includes 212 old records /63 gates by unchanged tracked files,
not rerunning them. All33files/60variants remain blocked. COORDINATION edits by
the coordinator are excluded from owned diff and preservation counts. No old
test proposals are needed for the non-emitting first slice; later emission must
render its exact affected whole-file proposals before application.
