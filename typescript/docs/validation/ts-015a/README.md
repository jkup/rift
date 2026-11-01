# TS-015A validation and handoff

2026-11-01; assigned base f1987eb, codex/primitive-computed-keys. Coordinator
commit 4d6cc02 records dispatch and is preserved. This implements batch 1 only.

## Changes

Semantic Define, internalSet and Set now require the active OperationContext.
PutValue, both receiver branches, literals, map and all host consumers forward
that context with the original location and RHS. Exact throws and strict false
translation are preserved. No context is fabricated inside semantic operations.

The ambiguous define API is removed. Descriptor-form bootstrapDefine invokes a
protected bootstrap-only override at synthetic 1:1, converting false/throw to a
host initialization fault. Ordinary semantic/bootstrap definitions share one
validated private-storage implementation. Array construction invokes the super
ordinary validator directly, bypassing subclass methods. Array entries share
index growth and the complete normalized length commit/shrink/rollback phase.
Primitive normalization is also shared for this batch; semantic object length
continues to return the existing unsupported TypeError. Bootstrap object length
fails as a host invariant before any read/call or mutation.

## Acceptance matrix

- P1: definition-dispatch preserves own/new success/false/throw cases and exact
  records, location, descriptor flags and RHS. It now checks context identity,
  inherited Set, direct Define, active realm and zero ticks/calls at zero budget.
  Key observers forward context; both compiled key drivers assert its identity.
- P2: object-descriptors checks bootstrap frozen SameValue (-0 versus +0) and
  retains nonextensible rejection. Array-storage checks valid/invalid primitive
  lengths, +0 normalization, frozen length/index growth and closed-array holes.
- P3: array-storage observes semantic, bootstrap and ordinary subclass methods:
  construction calls none and creates +0/true/false/false length. Later bootstrap
  invokes only its dedicated observer. DefinitionObject setup bypasses its
  semantic throw mode. Dedicated bootstrap false/throw observers retain the old
  host-fault, exactly-one-call, synthetic-location and absent-property assertions.
- P4: array-storage uses a throwing Get observer for an object length: host fault,
  zero reads, unchanged indices/length. Ordinary length and array element retain
  that exact object without inspection.
- P5: bootstrap sparse shrink deletes index 5, stops at fixed 3, restores length
  4 readonly, retains 3/1 and leaves the input descriptor unchanged. Existing
  semantic partial deletion cases run through the same shared storage method.
- P6: all prior entries, metadata flags, literal holes, map order/counts, exact
  budgets and realm independence remain. realms now checks realmMarker Set's
  result and uses contexts from each corresponding Realm.

## Migration audit

caller-inventory.txt is a fresh src/test search after migration. Host Map.set
(binding/storage/snapshot maps) entries are not semantic writes. All consumers
listed in the frozen design were migrated; no .define alias remains. The probe
objects toy class is independent and unchanged. No manifests, pins, C++, Claude
queue or COORDINATION changes belong to this implementation.

## Environment and limitations

Initial sandboxed native/probe builds failed linking because Zig could not find
its installation directory. Retained *-sandbox transcripts and result JSONs
record these failures. Retrying with approved access to the same pinned installed
Zig succeeded for both probes and the full native suite.
No compiler blocker, workaround, fallback, dynamic tier or gate relaxation was
introduced. Native evidence applies to Windows x64 only.

Effectful array length, double guest conversion, reentrancy and L1-L21 remain
unimplemented and require the separately assigned batch 2. Primitive converter
and semantic array-storage zero-hook rejection assertions remain intact.

## Final results

- Typecheck passes (typecheck.txt).
- Runner regressions: 20/20, no skips/failures (runner.txt).
- Compiler probes: 10/10, both lanes and coverage (probes.txt, probe-results.json).
- Rebuilt Node guests: 161/161, no skips (node.txt, guest-node-results.json).
- Rebuilt native guests: 161/161, no skips (native.txt, guest-native-results.json).
- All 20 native static-only builds and separate coverage gates pass, 100% static
  in each report (native-build-results.json). No manifest entries were changed.
- Final suites have no harness failures, timeouts, crashes or unsupported skips.
  Initial environment failures are retained separately above.

Implementation is ready for coordinator review; batch 2 remains blocked.
