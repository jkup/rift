# Catch binding patterns

Catch parameters support array and object binding patterns, defaults, computed keys,
nesting and rest. All bound names exist before initialization; duplicates and handler
lexical/var conflicts reject before execution. The Annex B var exception remains
exclusive to identifier catches. Optional catch still has no parameter environment.

Generator and async catch initialization retains pattern positions, iterator close
obligations and the catch environment across suspension. The handler runs only after
initialization succeeds. Abrupt resumption closes outstanding pattern iterators before
outer catch/finally processing. Pattern defaults in other declaration and assignment
contexts retain their existing unsupported admission boundary.

Independent references cover evaluation order, TDZ, eval/Annex B conflicts, suspended
keys/defaults, injected return/throw, close failure precedence and async generators.
Focused tests also cover detached metadata, defining Realms, caller budgets and cleanup.
TS-551 canonical acceptance passed on 2026-11-14: 999 guests per host, 481 native
static-only/zero-dynamic gates, 296 tooling checks, 35 runner checks, ten probes
and the unchanged original 225-file corpus. Declaration, assignment and loop
pattern suspension remain separate pending successors.
