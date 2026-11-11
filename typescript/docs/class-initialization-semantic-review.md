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
