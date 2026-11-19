# Private brand checks

TS-467 is in progress. Bounded Script admits `#name in object`. The parser keeps
the existing private-name scope validation and relational precedence. Private
names remain unavailable as ordinary values.

Ordinary execution and suspension continuations share one final operation:
reject non-objects, resolve the captured private identity, then query the
receiver's own private storage. The right operand completes before that operation.
No accessor, property conversion or prototype traversal occurs. Method brands
exist before field initialization; each field brand appears only after its own
initializer completes.

The design follows the relational evaluation specification linked in
`private-brand-check-review.md` and the private-storage design in
`class-private-elements-review.md`. The implementation reuses the budgeted
private lookup backend. Suspended operands retain their lexical private
environment through the existing frame machinery.

Independent Node checks cover 22 semantic and eight invalid syntax cases. Focused
Rift tests additionally cover generator return/throw, async functions/generators,
Unicode names, defining-Realm errors and resource-limit restoration. Focused Node
and typechecking pass; full Node and native validation remain pending. Two
historical test files retain exact source strings with changed expectations
recorded in `build/private-brand-test-migrations.json`.

Isolated validation passes936/936 Node guests, focused native with19,833/19,833 static statements, all nine native regression groups, fifteen tooling-driver builds and296/296 tooling tests. Eight native producer records match Node; sixteen records pass parent envelopes. Combined canonical acceptance remains pending.
