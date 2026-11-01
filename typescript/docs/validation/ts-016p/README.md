# TS-016P design evidence

Date: 2026-11-01. Assigned base: `bf8c129`; runtime baseline `3a5d360`.
Branch: `codex/primitive-computed-keys`. Design owner:
`01a19943-623a-70c0-a2c2-07ce8c487217`.

Deliverable: [realm intrinsic prototype contract](../../realm-intrinsic-prototypes.md).
Its G1-G17 and future migration matrices are proposed acceptance requirements,
not executed test results. No production, tests, manifests, compiler pins, C++,
Claude queue or COORDINATION edits are part of this task.

## Inspection performed

Read AGENTS, project-goals, compiler-contract, frozen TASKS and COORDINATION.
Inspected Realm registration/console/Number, every production GuestObject and
GuestArray allocation, the evaluator call boundary and literal/closure creation,
array storage/bootstrap definitions, internal map and host driver expectations.

Retained searches:

- [Host allocation, prototype and conversion search](allocation-search.txt),
  produced from `rg -n 'new Guest(Object|Array)|getPrototypeOf|setPrototypeOf|no primitive|cannot convert|constructor|species|toString|valueOf' typescript/test --glob '*.ts'`.
- [Production allocations and all builtin registration callers](production-search.txt).

Searches are an index into baseline code, not a substitute for reading the
surrounding assertions. In particular, array-literals shape is production-backed,
whereas array-storage's null-root assertion is deliberately low-level. Existing
parsed operator negatives and the missing-method array-length fixture will need
positive migrations only when methods are installed. All those distinctions are
recorded in the contract. Hand-built callable fixtures retain their low-level
construction; no bulk migration is proposed.

## Source revision evidence

ECMA-262 fixed 2025 edition, 16th edition: fetched the ordinary/exotic objects,
fundamental objects, indexed collections, abstract operations and Realm sections
through web browsing. Algorithm links and decisions appear in the contract.
The fixed edition is the normative revision used, not current main.

engine262 commit `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, resolved with
GitHub `fetch_commit(main)` on this date (commit date 2026-10-23). Then read the
following files with `fetch_file` at the exact commit ref:

| File under src/intrinsics | Returned Git blob SHA |
| --- | --- |
| ObjectPrototype.mts | `a5fa027f94f95a395ac79488667e216084a2792b` |
| FunctionPrototype.mts | `893620c920ac185d2798fac0bd22af957b942e3a` |
| ArrayPrototype.mts | `c85086e2f2adf94d40c9d2cb897c8222083b701c` |
| bootstrap.mts | `9e84ca9a46de940b17373d79c36469f1373125bc` |

Inspected root creation and method installation, Function root invocation,
Object immutable dispatch, array exotic creation, builtin metadata/constructor
back-links and conversion prerequisites. No third-party source copied.
Initial shell GitHub lookup failed DNS and web raw-source fetches missed cache;
the connected GitHub read API succeeded. Guessed realm source paths returned
404 and are not cited as inspected evidence.

## Validation and limits

Documentation-only: no probe was necessary because no concrete compiler
uncertainty was encountered. Optional constructor parameters, direct class
references and typed callable records already occur in the codebase; this is
design rationale, not proof the future combined patch compiles. No native or
Node test suite was rerun and no new capability is claimed.

Inherited accepted baseline is coordinator-reported Node/native 162/162 and
21 static gates for TS-015B, with retained producer runner20/probes10/typecheck.
Implementation must rerun all required lanes and gates. G matrix can extend the
existing realm driver, avoiding a new harness entry, while preserving assertions.

Local review: verified branch/origin, complete allocation and registration
searches, explicit source revisions, graph and future-method separation,
cross-Realm identity versus deferred function Realm entry, and whitespace check.
Stop for coordinator design review; no implementation or successor started.
