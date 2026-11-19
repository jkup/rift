# Suspended property assignment targets

Assignment retains the base while its key suspends, then creates the ordinary
strict/sloppy property reference before evaluating the RHS. Key conversion stays
deferred until PutValue, and no getter runs merely to obtain the target. The
existing assignment frame handles the write and expression result.

Tests cover base/key/RHS order, changing bases, keys and setters, nullish and
primitive bases, symbols, strict failures, nested assignments and abrupt cleanup.
Async bodies, cross-Realm errors and current-session setter limits also run.
The historical rejected target inputs now execute. See [ECMA-262 assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation).

Compound/update and super targets remain separate. Evidence stays under ignored
build/generator-assignment-target-* paths pending combined canonical acceptance.
