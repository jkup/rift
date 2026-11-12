# Contextual let identifiers

Bounded Script preparation admits sloppy let bindings, references and labels.
Declaration lookahead distinguishes those expressions from lexical declarations;
the existing Statement-position audit remains separate. Lexical BoundNames
containing let stay explicitly unsupported. Strict identifier sites reuse the
complete-source strict-reserved-identifier audit.

For-of assignment heads retain their first token so a leading let is rejected
even when it becomes a property target. Parenthesized targets remain valid.
Array-pattern declaration parsing preserves the `let [` lookahead restriction in
expression statements and for-in heads. Newline handling follows the existing
statement terminator rather than treating every newline as a declaration boundary.

The 156 reviewed syntax controls pass under Node, together with 36 execution
cases, three supplementary checks, seven strict errors and fourteen unsupported
controls. The original `var let=1;` input remains in its driver with a ready
expectation. A new execution test initially ended with the invalid expression
statement `let[0]`; it was corrected to `(let)[0]`, with the correction retained
in build/focused-test-correction.json. No historical fixture changed.

See docs/let-identifier-context.md for the independent reference review and
specification links. Full Node regression passes 955/955 without skips, and all
35 runner tests pass. Eight strict-error producer records pass the closed Node
codec. The 1068 source/control inputs are frozen. Focused execution, the historical
strict-name driver and all 156 syntax controls now pass both hosts with static-only
builds and zero dynamic coverage. The amended snapshot passes all 15 native
tooling build gates and all 296 tooling tests without skips. Eight producer records
per host and 16 parent envelopes pass. Combined canonical acceptance remains
pending.

The initial tooling run passed 295/296 tests. Reviewing all 140 historical lexical
audit inputs found three newly supported expressions (`while(false) let=1;`,
`if(false) let(1);`, `if(false) let.x=1;`) and a diagnostic-only change for the
still-unsupported `while(false) let let;`. Their original bytes and expectations
remain in the frozen fixture. The test asserts those originals before applying
four explicit current expectations. All five parser-audit groups pass both hosts
after the migration. The first targeted attempt and failed full suite are retained.

Only tools/test262/parser-audits.test.mjs changed in the amended source snapshot;
the other 1067 inputs, including runtime and guest tests, are byte-identical.
Original native reports and executables are archived. Fresh focused native builds,
all tooling gates and protocol checks pass for the amended snapshot.
