# Optional catch bindings

TS-550 admits catch without a parameter in the isolated optional-catch draft.
The parser records a null parameter; declaration planning associates the handler
with its ordinary enclosing scope. Execution uses the handler block directly in
both ordinary and suspended paths. Existing identifier catches retain their
parameter environment and initialization. No guest source rewriting is used.

Fourteen independent reference programs and the focused driver cover strict and
sloppy code, lexical/var scope, direct eval, closure capture, return/finally,
break/continue, nested throws, generator yield/return, async rejection/await and
legacy block functions. Eight invalid programs retain parse SyntaxErrors.
Defining-Realm arrays, resumed generators using caller budgets, creator-session
isolation, resource cleanup and declaration ownership have focused checks.

This draft starts from the exact frozen, Node-tested TS-548 snapshot. Its
predecessor provenance is provisional until final TS-548 READY reconciliation.
Full regression, native static-only/zero-dynamic validation, tooling and canonical
acceptance remain pending. Catch binding patterns remain separately scoped under
TS-551, including the suspension prerequisite recorded by TS-552.
