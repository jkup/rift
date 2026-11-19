# Rift agent instructions

Read CONTRIBUTING.md and docs/compiler-contract.md before implementation.

- Prefer clear TypeScript and preserve observable evaluation order.
- Keep guest state in a Realm, control flow in completion records and I/O outside
  the semantic core. Never use host eval, Function, vm or a dynamic compiler fallback.
- Preserve the pinned compiler, full callback arity, static-only builds and the
  separate zero-dynamic coverage gate. Explain compiler workarounds where used.
- Run format, lint and test:readability before handoff. Do not widen ignores,
  disable rules or increase structural allowances to pass. Run lint:ratchet after
  reducing existing violations. Follow CONTRIBUTING.md's suppression policy.
- Run typecheck, test:runner and relevant Node/native checks. Run test:compiler for
  toolchain or integration changes. Report actual scope, failures and skips.
- Preserve expected-result assertions and conformance denominators.
- Coordinate one writer per shared checkout. Preserve unrelated changes and record
  scope and validation in the issue or PR, not repository session logs.
- Test fixtures include pinned bytes and intentionally invalid syntax. Do not
  format them or rewrite their expected results as incidental cleanup.
