# Authoring and validation record

No scriptc or C# compiler invocation, supervisor launch, guest execution, install,
environment change or process-cleanup experiment was performed in this continuation.

Read-only discovery resolved PowerShell to
C:\Users\jonku\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe,
version7.6.5, Windows10.0.26200. Node realpath/hash reads confirmed C:\WINDOWS,
C:\WINDOWS\system32 and C:\WINDOWS\system32\cmd.exe. Exact executable hashes
appear in contract.json. Hashing pwsh.exe is deliberately not a full PowerShell/
.NET closure claim; installed modules/runtime remain trusted assumptions.

offline-mQj2l8 and offline-rQImDc are earlier complete passing plan checks retained
unchanged during source self-review. Final offline-J6W355 checks the final runner
proposal:1complete plan/21environment keys and8completed plan-source mutants.
Each mutated full module imports and returns its plan; an exception would fail
the test instead of counting as rejection. All24retained mutant calls across
the three authoring runs completed; report8distinct mutants, not24distinct cases.
There are no failed offline tests or relaxed expectations.

Self-review corrected an import-cycle risk between the executable runner and
its verifier before invocation, added null rather than zero for unknown compiler
creation, zeroed process handles after failed CreateProcess, retained only8MiB
raw compiler stream bytes, and added original project/config pre/post inventory.
These changes were never tested by launching a compiler. Final Node syntax and
full-module import/plan tests pass; PowerShell Parser.ParseFile found0errors.
syntax-results.json retains the earlier syntax-only record, whose PS source
remains unchanged. Later runner/verifier node --check commands also completed0
(tool chunks8fd334/227ea6). C# has not been compiled or runtime-tested.

One multi-file apply_patch was rejected because the README search context used
lowercase 'preflight' rather than actual 'Preflight'. No part of that patch was
applied; an immediate rg confirmed projectSnapshot absent before the corrected
patch. This authoring error is not an expected rejection or validation case.

The frozen original-design.md was read directly from commit0e733798, not rebuilt
from the edited document. prior-seals.json checks the two original manifest files
against that commit before freezing their identities. Original9333baseline and
39artifact hashes are reused verbatim, with the old document checked as an exact
prefix. No old evidence, oracle or proposal was regenerated.

Remaining material uncertainty: Add-Type/C# and P/Invoke feasibility; sandbox or
nested-job assignment; cleanup timing and pipe behavior; actual metadata schema,
upward config lookup, cache/SDK/DLL inputs and unobserved external effects. Any
failure/unconfirmed cleanup stops for review and forbids retry, per exact runner.

Staging warned that syntax-results.json's PowerShell CRLF bytes would normalize
to LF. Before commit, the first continuation guard manifest was retained verbatim
as initial-guard.json and scoped .gitattributes disables text conversion for this
new evidence directory. The final continuation manifest adds those artifacts and
this note. Original0e733798seals/hashes and syntax record bytes remain unchanged.
This is a packaging correction, not a failed probe or regenerated old oracle.
