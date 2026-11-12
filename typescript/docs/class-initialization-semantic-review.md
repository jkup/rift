# Class initialization semantic review

TS-489, 2026-11-11. Seventeen supported cases agree exactly with an independent
Node subprocess on stdout and successful completion. Cases cover base field/default
parameter ordering, computed keys before static initialization, own-property field
definition, constructors returning other objects, duplicate private stamping,
private method availability and forward field reads, static private inheritance,
field new.target, super getters, static blocks, inferred field names, repeated
super calls, initialization throws and private accessor pairs.

The eighteenth input reaches an explicit existing gap: Proxy is not defined in
Rift. Node reports that a proxy lacks its target's private brand and that private
access through it throws TypeError. Rift cannot exercise this case until Proxy
exists; it is retained as unsupported, not counted as a passing class case.
No supported-case mismatch justified a runtime change.

This is a bounded Node-hosted differential review, not native acceptance, an
expected-result regression suite, or full class conformance. The reference runs
in a separate Node CommonJS stdin process; Rift parses and interprets each source
through its own CLI. Inputs, hashes, statuses, signals, errors and full output are
retained in build/class-initialization-semantic-review.json. The producer is
build/review-class-initialization-semantics.mjs. Canonical foundation sources
remain frozen and unchanged.

## Native follow-up

TS-512, 2026-11-12, replays all eighteen unchanged sources against fresh independent
Node and both current Rift diagnostic hosts. Seventeen supported cases match
explicit expected outputs and complete normally on both hosts. Source hashes
match the original review. The Proxy case still stops with ReferenceError before
producing output in Rift; it remains a missing prerequisite, not a passing class
case. Independent Node still produces the original private-brand result.

Both Rift hosts return identical structured results, with no process errors,
signals or failed jobs in supported cases. The native diagnostic executable is
bound to the reviewed static-only/zero-dynamic build by its hash; the canonical
source snapshot verifies before and after replay. No runtime change is justified
by this selection. This closes the native-evidence gap for these cases without
claiming complete class conformance.

Evidence: `build/class-initialization-native-review/` contains all sources,
expected outputs, fresh reference results, both-host records and `reviewed.json`.
The original review remains unchanged.
