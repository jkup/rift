# Suspended property reads

Member expressions retain the evaluated base while their computed key suspends.
The resumed key goes through the ordinary reference read, preserving primitive
boxing, key conversion, getters and the original receiver. Frames contain values
and syntax only; reads use the resuming session and the activation's Realm.

The parser admits ordinary member reads in already supported expression positions.
Reference-specific delete, assignment targets, call receivers, super properties
and optional chains remain separate. A suspended property read inside a comma
expression still produces a value, including when used with delete.

Tests cover both suspension positions, nested members, delegation, getters,
Symbols, primitive receivers, base replacement versus mutation, conversion order,
throw/return interruption, async functions/generators and cross-Realm errors.

See [ECMA-262 property access evaluation](https://262.ecma-international.org/16.0/#sec-property-accessors-runtime-semantics-evaluation).
Native static-only coverage and the focused suite pass. Full Node and neighboring
native regressions are recorded in ignored build/generator-member-* logs; combined
canonical validation remains required before acceptance.
