# RegExp backend evaluation

Pinned scriptc 0.4.7, Node 26.13.0 and Zig 0.17.0, Windows x64. These are host-runtime probes, not guest RegExp admission or a conformance claim.

- `backend.ts` compiles at 26/26 static statements, zero dynamic, but its output differs: runtime flag `d` works in Node and throws Error in native. `rejected-reports.json` retains the `OUTPUT-DIFF` verdict.
- `details.ts` produces two compiler blockers: SC1120 for a statically known `d` flag, and SC2020 for groups metadata from a dynamically constructed pattern. The compiler explicitly limits groups lowering to statically known regexes. The retained verdict is `BUILD-FAIL`; no executable result is invented.
- `supported.ts` removes those unsupported operations and passes static coverage plus equal output in `supported-report.json`. Explicit code-unit output checks supplementary characters, lone surrogates, NUL, named-group matching without metadata, Unicode properties and v-set matching. This control does not erase either failed probe.

Commands use `scriptc build --tier static-only`, separate `coverage`, and the repository's fail-closed verdict parser. Artifact executables remain under ignored `build/regexp-evaluation`.

## Decision

Do not make this host API the general guest RegExp implementation. It cannot currently expose all dynamic metadata required by guest patterns, and its standard synchronous exec API offers no hook for Rift's step budget. Correct UTF-16 behavior in the passing control is useful evidence, but not a substitute for those requirements.

Proceed with a bounded regex parser and an explicit matching machine in TypeScript, then add the guest constructor/protocol layer separately. Start with literals, classes, groups, alternatives, assertions and greedy/lazy quantifiers; keep backreferences, lookaround and Unicode modes explicitly unsupported until implemented. An explicit backtracking stack can preserve ordered matching while charging each transition to the session budget; it must also handle zero-width repetition and capture resets. This is a regex-specific instruction stream, not a change to the JavaScript tree-walking architecture.

The design review includes [V8's regex automaton explanation](https://v8.dev/blog/non-backtracking-regexp) and its [interpreter's explicit backtrack limit](https://chromium.googlesource.com/v8/v8/+/refs/heads/lkgr/src/regexp/regexp-interpreter.cc). V8 uses instruction streams and an explicit backtracking stack; its linear engine is a different execution strategy. Rift's first slice prioritizes observable ordering and explicit bounds, without claiming linear-time matching. ECMAScript's matcher algorithms remain the semantic authority.
