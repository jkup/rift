# Coordination

Updated 2026-11-19. One implementation writer at a time in this checkout.

TS-569 README/logo cleanup is complete; implementation ownership is released.
README now covers purpose, execution model and local Node/ScriptC commands, with
the owner's emailed PNG stored under docs/assets. Format, lint, typecheck,
9 readability tests, 36 runner tests, 1003 Node guests, both Node examples and
README link checks pass. No skips. Native builds/probes were not rerun for this
documentation-only change. No writer or native build is assigned.

TS-568 repository cleanup is complete; its implementation ownership is released.
See [TASKS.md](TASKS.md) for exact acceptance: 1003 Node guests, 36 runner tests,
nine readability tests, format/lint/typecheck, examples and preservation checks
pass. Native and full Test262 suites were not rerun for this cleanup.

Current instructions are in [AGENTS.md](AGENTS.md) and
[CONTRIBUTING.md](CONTRIBUTING.md). Record new ownership and validation here;
do not carry forward old session IDs, branch names or publication permissions.

The migration-era coordination log is retained in Git at
`ee58390b78a8fd4f12488fa00af6b1f029d045a9:COORDINATION.md`.
Recover it with `git show ee58390b:COORDINATION.md` when investigating old work.
