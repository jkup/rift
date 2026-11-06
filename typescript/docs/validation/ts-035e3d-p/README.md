# E3d-P audit stop

Base bf02056238bce71d46505a6f92640305d640a5eb. Read
`../../script-conformance-preflight.md` for the actual construction audit,
reduced protocol mismatch, alternatives and unfinished acceptance requirements.

This is a substantive-ambiguity review handoff, **not a completed frozen design**.
No implementation additions/replacements are authorized. The manifest's empty
proposal lists are deliberate; they must not be interpreted as a passed design.

- `closure-audit.json`: complete tracked live/historical lexical inventory,
  conservative project import graphs, exact original fixture bytes.
- `baseline.json`: working-byte SHA256/length protection for 8,498 pre-existing
  tracked files, excluding only TASKS and coordination. Initial git status was
  clean at the recorded base before the owned task claim.
- `producer-boundary.mts`: exact accepted private positional request span,
  isolated without imports, Realm or IO. No production module is installed.
- `reduce.mjs` / `reduction.json`: three direct isolated parser checks plus
  twelve complete hand-constructed synthetic inputs and twenty-four checks of
  the actual two codecs. Independent case decisions are literal in the runner.
  Both lane labels are data; all checks run in Node, no native or guest process.
- `reduction-codecs-only.json`: initial codec-only result retained before adding
  the isolated parser reduction. No failed engine execution was hidden.
- `mutations.mjs` / `mutations.json`: six accepted full-object baselines and 130
  field deletion/unit/role/Realm/completed-prefix/nonce rejection checks against
  the actual codecs. This is only the bounded reduction's mutation coverage,
  not the outstanding full preflight control oracle.
- `proposal-manifest.json` / `verify.mjs`: explicit no-implementation manifest,
  evidence hashes and baseline verification. The original parser span is also
  compared byte-for-byte by the verifier, independently of its recorded hash.

The initial verifier failed only because Git normalizes TASKS line endings while
its pre-existing working copy has 33 CRLFs before E3d-P. The initial verifier and
manifest plus the bounded diagnosis are retained. The corrected verifier
normalizes line endings only for that comparison; all 8,498 baseline files still
require exact original working bytes. No historical file/hash was regenerated.

Replay from repository root:

```text
node typescript/docs/validation/ts-035e3d-p/reduce.mjs
node typescript/docs/validation/ts-035e3d-p/mutations.mjs
node typescript/docs/validation/ts-035e3d-p/verify.mjs
```

`audit.mjs` is the original inventory capture, writes with wx and is not a
refresh command. Do not regenerate baseline or historical identities. The
reduction's --write likewise creates a new result only, never overwrites it.
No full suite, build, conformance launch, authority API, guest execution,
registry activation, old-test or historical evidence write occurred.
