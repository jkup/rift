# Semantic examples (CL-003)

These are small standalone guest programs. Each teaches one semantic rule and has an exact expected
stdout. They use no assertion library, so you read the source and compare its output.
`manifest.json` holds the expected stdout and is authoritative. This README repeats it for reading
convenience.

These are **not** wired into `typescript/test/` or any package script. The coordinator decides
whether and how to integrate them.

## Groups

- `current/` uses only the TS-001 syntax subset described in `typescript/docs/feature-inventory.md`
  (at base `0819c71`): `let`, blocks, `if`/`else`, `while`, `break`/`continue`, function
  declarations and anonymous function expressions, `return`, object literals, dot and computed
  string-key access, numeric operators, `===`, `&&`/`||`, string + string and `console.log`. There
  are no `var`, `for`, `++`/`+=`, `typeof`, `==` or ASI.
- `deferred/` needs later features (listed per file in the manifest's `needs`). These are
  **not current regressions**.

## Verification

```bash
node typescript/fixtures/assistance/semantic-examples/verify-node.mjs
```

This runs each file under Node as a classic CommonJS script and compares stdout byte for byte.
Measured on 2026-11-01 with **Node v26.13.0: 12/12 match**. The expected outputs were written by
hand first, and Node agreed without changes. Node agreement is reference evidence, not proof that
Rift supports an example. The examples were **not** run under Node-hosted or native Rift for this
task.

Determinism: no timers, I/O, randomness, dates, locale, error messages or object/function
rendering. Every logged value is a number, string, boolean or `undefined`. `console.log` with
several arguments is expected to join them with single spaces, as the existing
`typescript/test/fixtures/semantics.js` already assumes.

## Examples

| File | Rule | Expected stdout |
|---|---|---|
| `current/01-retained-mutable-closure.js` | A closure retains and shares its captured binding, and sees later assignments | `1` `2` `3` `after` |
| `current/02-closure-independence.js` | Each call makes a fresh environment. Closures from one call share it; closures from different calls don't | `1 2 101 3 102` `7 0` `7 9` |
| `current/03-object-aliasing.js` | Mutation is visible through aliases; rebinding a variable is not; identity is not structural | `2 true` `2 3 false` `10` `20 10` `false` |
| `current/04-method-receivers.js` | The call form decides `this`: member calls pass the object, plain strict calls pass `undefined` | `left right` `right` `left` `true` `true` |
| `current/05-evaluation-order.js` | Left-to-right evaluation of arguments, operands, callee, and assignment target/key before the RHS. Short-circuiting | see manifest (18 lines) |
| `current/06-shadowing.js` | The nearest binding wins. Inner bindings and assignments to them leave outer ones alone | `block` `outer` `parameter outer` `function` `51` `1` |
| `current/07-loop-side-effects.js` | The `while` condition runs before every iteration. `continue` re-tests it, `break` does not | `3 4` `6 9` `2 2` `1` |
| `current/08-return-propagation.js` | `return` exits from any depth. Missing or bare return gives `undefined`. Inner returns stay inner | `4` `early not reached` `undefined undefined` `inner false` `outer` |
| `current/09-function-declaration-hoisting.js` | Declarations are initialized before statements run, which allows calls before the declaration and mutual recursion | `16` `true true` `42` |
| `deferred/d1-for-let-per-iteration.js` | `for (let …)` creates a binding per iteration; `var` shares one | `0 1 2` `3 3 3` |
| `deferred/d2-finally-completion.js` | A normal `finally` preserves the earlier completion; an abrupt one replaces it | `finally ran` `try` `finally` `swallowed` |
| `deferred/d3-arrow-lexical-this.js` | Arrows take `this` from the enclosing function, however the arrow is called | `owner owner` `no receiver other` |

Each line of output is shown as a separate code span. Each line ends with `\n`.

## Notes for integration

- `04-method-receivers.js` and `d3` start with `"use strict";`. Rift has a strict-call profile
  regardless of directives (see the feature inventory), and the directive makes Node agree on
  detached calls. Without it, Node would pass the global object as `this`.
- `05-evaluation-order.js` writes through a computed member whose object is a call result
  (`note(…)[note(…)] = note(…)`). That exercises Reference evaluation order, not just syntax.
- Some overlap with `typescript/test/fixtures/semantics.js` is intentional. These split each rule
  into its own readable file with commentary, rather than one dense line.
