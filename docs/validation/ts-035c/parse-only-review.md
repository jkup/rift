# C closure review: parse-only harness inspection failures

Status: review requested, not a completed C candidate. Base `e66876d`.

Run from `typescript/` after the ordinary Node build:

```powershell
node docs/validation/ts-035c/parse-only-review.mjs
```

The retained JSON contains the actual engine outcome and both complete decoder
inputs. The witness loads unchanged original assert.js and sta.js in separate
records in one Script Realm/session. A bounded host fault control supplies an
object whose constructor getter exhausts that same session's steps. The next
harness occurrence executes `throw target;`. B preserves the original object,
record and source; its separate inspection result is `resource-limit/steps`,
count 100001, limit 100000. Active frame/calls/depth are restored. The test record
is never prepared, instantiated or evaluated. This uses no guest host-evaluation
or changed harness source. `harness/fault.js` is a synthetic host control, not a
claimed pinned corpus file or newly admitted include.

Both unchanged A decoders accept the projected record with action `execute`.
Changing only the action to `parse-only`, and recomputing its correct request
hash in both binding and child, makes both decoders reject it as protocol.
All ordered sources, units, limits, original/secondary sites and harness prefix
remain identical. The preflight ID is a synthetic binding value, not a claim
that this witness implemented/minted production preflight evidence.

The cause is identical in `script-driver-result.mjs` and `script-result.mjs`:

```js
if (v.inspection!==null) {
  need(b.action==='execute' && op.phase!=='parse' &&
    ['resource-limit','unsupported-operation'].includes(o.kind));
  // ...
}
```

This matches the design's blanket prohibition on inspection during parse-only
action, but conflicts with its required harness reload before parse-only test
preparation and retention of inspection resource/unsupported failures. The
action constrains the test; harness units still execute. Ordinary harness
constructor inspection already passes under parse-only when it produces a
throw Result (whose `inspection` field is null). Only its secondary
resource/unsupported outcomes encounter this prohibition.

Proposed minimal decision for review, **not applied**: permit non-null
inspection when `(b.action === 'execute' || op.stage === 'harness')`, retaining
the existing non-parse phase and resource/unsupported checks and every original
and secondary site invariant. Preserve the prohibition for test-stage
parse-only execution. Amend the design sentence accordingly, and authorize
the two exact A predicate changes plus additive regression tests covering
harness steps/calls/unsupported and test-stage negative mutations in both
decoders. No schema fields, engine code, B inspection API, rule registry,
capability or corpus admission need change.

C has not adopted this proposal, removed inspection, substituted a host fault,
or changed parse-only into execute. The assignment says: “Stop for concrete
review on contract/API/ownership/compiler ambiguity; retain/reduce before
workaround.” This is that review boundary.

Current C draft is limited to the two new source files, initial fixture matrix,
task claim and this evidence. Typechecking passes. The new driver builds
static-only with 3911/3911 separately reported static statements. The first
sandboxed Zig installation-access failure and successful escalated build are
both retained. No native execution/full suites/launcher/preflight completion
claim, no coherent candidate commit, no historical test edits, and no changes
to A/B or COORDINATION.
