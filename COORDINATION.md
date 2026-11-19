# Coordination

Updated 2026-11-19. One implementation writer at a time in this checkout.

TS-572 CI efficiency review is complete; implementation ownership is released.
The owner authorized committing and pushing the workflow/docs changes to main.
All local acceptance checks pass; see TASKS.md for scope. The inspected remote CI
run was blocked by account billing before execution.

TS-570 supporting-folder cleanup is complete; implementation ownership is released.
TS-571 native Test262 runner is complete; implementation and native build ownership
are released. The final top-level review is complete;
the owner authorized publication of the cleanup.

See [TASKS.md](TASKS.md) for deletion/move scope and exact validation, including
initial environment failures and the corrected checkpoint test. Interpreter
behavior, expected results, source pins and retained historical evidence are
preserved. Current contributor instructions are in [AGENTS.md](AGENTS.md) and
[CONTRIBUTING.md](CONTRIBUTING.md).

The new command is `npm run test262`; see `tools/test262/README.md`. Full-corpus
input preparation, focused fresh native execution, both-host runner regressions,
compiler checks and an isolated 1003/1003 Node guest run are accepted. TASKS.md
records initial environment/classifier failures and corrected evidence separately.
No full-corpus execution was performed for TS-571. The owner authorized committing
and pushing the accepted runner changes to main.
