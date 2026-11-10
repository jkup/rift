# Suspended array elements

Array literal continuations retain a newly allocated array, a source-element
cursor and the next property index. Elements and spread operands resume in order;
holes advance only the property index. Finishing defines length explicitly so
trailing holes survive. Allocation belongs to the executing activation's Realm.

Ordinary and suspended literals share element creation and spread iteration in
array-literal.ts. Data properties bypass inherited setters. Iterator failures
propagate without introducing cleanup that ordinary spread does not perform.
The continuation stores data only and uses the current execution budget.

Focused tests cover holes, nested arrays, spread, inherited setters, abrupt
resumption, async functions/generators and cross-Realm prototypes. Reports are in
ignored build/generator-array-* logs. Combined canonical validation remains a
separate acceptance gate.
