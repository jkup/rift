# Dispatch control admission review

Three dispatch drivers retained control-mode expectations from before class and
sloppy duplicate-parameter support. Their frozen wire tests did not invoke those
control modes. All three current controls failed when exercised directly.

The exact inputs remain unchanged. A supported class after an invalid numeric
assignment or lexical statement no longer vetoes the early SyntaxError. A sloppy
function with duplicate simple parameters now prepares and executes normally.
Only these expectations change; snapshot, identity, effects, Realm, profile and
occurrence assertions remain intact.

The new tooling check runs all three complete controls in Node and native hosts,
compares exact output, and verifies the declared 864/864/192 assertion counts.
Lexical dispatch's 72 history records must preserve state and the numeric seed
completion. This supplements the frozen wire suites rather than rewriting them.

Pre-change failures and corrected native build/coverage/execution reports are in
`build/dispatch-controls-draft/build/`. Logs use `build/dispatch-controls-*`.
No production source or guest fixture bytes change.
