# Pinned Test262 assertion readiness

TS-490, 2026-11-11. All 23 controls pass in strict and non-strict mode in
independent Node, Node-hosted Rift and native Rift: 46 outcomes per execution
host. Expected outcomes explicitly distinguish successful return from a thrown
Test262Error; agreement with Node alone is not the acceptance condition.

Controls exercise assert's exact-true requirement, SameValue and notSameValue
for NaN/signed zero/object identity/BigInt, correct and incorrect exception
constructors (including distinct constructors with the same name), absent or
primitive/null throws, missing callback arguments, array equality/length/type
failures, Test262Error construction and its thrower.

The assert.js and sta.js bytes match the previously recorded SHA-256 hashes from
pinned revision 91c70759363c46557b694792bf34a2551a7af5ba. Harness files are
concatenated unchanged with the control source. Every input and result is retained
under build/test262-assertion-controls; producing scripts are
build/review-test262-assertion-controls.mjs and
build/review-test262-assertion-native.mjs.

Native execution uses the accepted IANA foundation CLI, with its executable hash
checked against the 453-gate report before and after the run. Node-hosted execution
uses the current frozen zoned Temporal integration. These controls do not certify
that integration's native behavior; its full validation remains separate.

This is bounded assertion-harness readiness, not a conformance baseline. No
corpus cases were admitted, capabilities changed, negative phases reclassified,
or async/include helpers validated. Next, admission must retain the pinned
selection denominator and independently distinguish expected throws, harness
failures, unsupported syntax, timeouts and host faults.
