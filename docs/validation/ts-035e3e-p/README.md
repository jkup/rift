# E3e-P evidence

Base 760b25fead20bc0f10a41aba53db1a2b07d3e430. Design only; two new host-tool
proposals and no replacements. See ../../script-execution-identity.md for API,
source/callback/Realm audit, build-provenance limitations and deferred dependencies.

Reproduce the bounded probes from repository root:

```
node typescript/docs/validation/ts-035e3e-p/construction-probe.mjs
node typescript/docs/validation/ts-035e3e-p/offline.mjs
node typescript/docs/validation/ts-035e3e-p/verify.mjs
```

Use a separate ordinary copy when replaying probes: they write only their local
evidence outputs. The verifier is read-only; --implemented allows only the exact
two new installed files. Do not rerun audit.mjs, freeze-literals.mjs or finish.mjs
to refresh historical expectations. audit.py was never successfully invoked.

Observed results: 20 full literal descriptors; 52 source hash comparisons;
10 exact API boundary errors; 20 inert actual-class construction traces and
fresh allocation checks; 100 inert source/Realm identity controls; six completed
construction mutants; 12 actual descriptor mutants (240 completed calls); 16
complete witness data mutations with recomputed self-consistent digests. No
guest source, full suite, compiler, native binary or conformance launch occurred.

descriptor-literals.json was authored without importing the proposed module.
Every object/array/key order and full source snapshot is compared. The constructor
probe extracts accepted host source only and uses inert stubs; it is not an
engine test. The witness matrix compares complete retained data with independent
expectations; it is not a provenance implementation. main-request-literals.json
retains the unchanged full E3b main data. identity-witness.json retains all 160
E3d request literals, installed source/package inventory and accepted generated/
binary identities. Retained evidence is labeled separately from new measurements.

Original setup failures are retained: construction-probe-initial.mjs and
construction-initial.log show Node rejecting unsupported transform mode before
testing. The successful reduction explicitly expands the single constructor's
parameter properties then strips types; production is unchanged. Initial shell
inspection also failed on bash-style brace syntax; two guessed evidence filenames
did not exist (native-binaries.json and E3b future-literals.json); python.exe was
an inaccessible WindowsApps alias. Those were setup/inspection failures and count
as no rejection. No compiler workaround or weakened semantic check followed.

Do not use these descriptions or hashes as success credentials. Current sources
are not rechecked by the pure API; its literal currentSourceVerified is false.
Build provenance, target-specific preflight, archive, receipts and F stay deferred.
All original tracked bytes are protected except own TASKS and root COORDINATION.
