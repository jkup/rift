# Rift contributor instructions

Rift is a TypeScript JavaScript interpreter compiled with the pinned scriptc toolchain. Read docs/project-goals.md, docs/compiler-contract.md and TASKS.md before implementation.

- Choose clear implementations a TypeScript developer can follow. Correctness constrains simplification; preserve observable evaluation order.
- Follow docs/readability.md. Run npm run format, npm run lint and npm run test:readability before handoff, in addition to semantic checks. Fix findings; do not widen ignores, disable rules or raise structural allowances to make a change pass.
- Prefer named intermediate values, early returns and small helpers with clear responsibilities. Preserve full compiler-required callback arity with underscore-prefixed unused parameters. Use only rule-specific, single-line lint suppressions with an explanation after --.
- Existing structural exceptions are measured per file/function in .readability-baseline.json. New or growing violations fail. Run npm run lint:ratchet after improvements; it only lowers/removes allowances. Treat configuration/baseline increases as explicit policy changes requiring review.
- Keep the same source runnable under Node. Never execute guest code through host eval, Function, Node vm or a dynamic compiler fallback.
- Keep I/O outside the semantic core and mutable guest state inside a Realm. Guest control flow uses completion records; host exceptions indicate implementation faults.
- Keep static-only native compilation and the zero-dynamic coverage gate. Isolate and explain compiler workarounds; do not change the pinned toolchain for unrelated features.
- Run typechecking, test:runner, relevant Node and native guest checks, and test:probes for toolchain/integration changes. Report tested scope and failures honestly.
- Keep expected-result assertions; report skips, unsupported features, timeouts, crashes and harness failures separately. Do not change conformance denominators to improve claims.
- Coordinate one implementation writer at a time in the shared checkout. Preserve unrelated work. Record task status and acceptance in TASKS.md and COORDINATION.md.
- Historical evidence under docs/validation and docs/history retains original paths and measurements. It is not a current build instruction. The retired implementation is no longer part of this project.
