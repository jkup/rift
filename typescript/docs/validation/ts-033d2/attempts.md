# Attempts retained during implementation

- Initial read used root-relative docs paths; canonical docs and TASKS are under typescript/. No files changed by the failed read.
- One PowerShell read used bash-style brace expansion and failed before execution. Retried with explicit paths.
- Initial typecheck: test/script-global-declarations.ts(125,61) TS2322, inferred mixed string/string[] table. Added an explicit [string,string[]][] table type, retaining all expectations. No production workaround.
- Literal G03 source-only position check gives function/var names at columns24,43,55,70. This check did not execute guest source or inspect planner output.
- First full native attempt: all old entries failed Zig installation-library access under the sandbox. The new test also exposed SC1090 at two nullable/union completion comparisons. The full raw report and pre-narrowing host source are retained. Explicit discriminant/null narrowing preserves the original identity assertions; production code unchanged. No frozen expectation change.
- Host suite sandbox attempt failed on symlink/temporary rename EPERM. Approved rerun passes host73 and observation16.
- Probe sandbox attempt failed Zig installation-library access; raw report retained separately.
- Minimal reduction first used identical normal/throw record layouts and compiled successfully, so it did not reproduce SC1090. Retained that source/report; adding the real throw-only diagnostic field reproduces the compiler limitation. Final before/after reduction passes its expected rejected/static outcomes.
- Final fresh-binary observation replay: 15/16, T30 ENOENT transport.json, the documented CL006 pre-launch cancellation race. Earlier observation run passed16/16. No retry or test/limit change; final acceptance remains incomplete.
- Initial commit attempt failed because Git had no configured author identity. The commit command uses the same identity as the existing branch history via command-local configuration; persistent Git settings are unchanged.
