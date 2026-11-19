# TS-033B interface freeze (before implementation)

Base f9073a7; 2026-11-02. Sole writer owns only the new module/driver,
additive native gate, fixtures/evidence, TASKS and feature inventory.

Normative source: [ECMA-262 2025 §9.1.1.4](https://262.ecma-international.org/16.0/#sec-global-environment-records),
the complete retained clause in ../ts-033p/upstream.json (document SHA256
6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713).
Object/declarative operations: §9.1.1.1 and §9.1.1.2. Engine evidence is
[engine262 d553e7b](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/execution-context/Environment.mts),
retained numbered source in that same file: 101–235 lexical initialization/TDZ,
503–599 object presence/Get/Set, 644–759 composite dispatch, 800–948 global
this, restricted property, declaration checks and creation. Source inspection
only; no engine262 execution or copied implementation. Web reader could not
retrieve the large fixed edition; retained bytes and pinned source were read.

`GlobalEnvironment(globalObject: GuestObject, globalThis: GuestObject)` in
src/global-environment.ts stores private mutable lexical state per instance.
It neither owns nor installs a Realm profile. Supported methods:

* hasLexicalDeclaration(name): boolean; hasBinding(name, loc): InternalBooleanCompletion.
* createMutableBinding(name, loc): ValueCompletion creates only nondeletable let
  bindings, initially uninitialized; duplicate lexical creation returns TypeError.
* initializeBinding(name, value, context, loc): ValueCompletion. Existing lexical
  must be uninitialized (host invariant failure otherwise); object fallback uses
  ObjectEnvironment InitializeBinding, including its non-strict Set.
* getBindingValue(name, loc), setMutableBinding(name, value, context, loc):
  ValueCompletion, strict-only public binding access. Lexical TDZ wins over globals.
* getThisBinding(): Value; withBaseObject(): Value (undefined).
* hasRestrictedGlobalProperty(name), canDeclareGlobalVar(name),
  canDeclareGlobalFunction(name): InternalBooleanCompletion. Ordinary own
  descriptors/extensibility are synchronous and cannot return guest throws in the
  existing API. No new exotic-object contract is invented.
* createGlobalVarBinding(name, context, loc), createGlobalFunctionBinding(name,
  value, context, loc): ValueCompletion, D=false only (Script declarations).
  Normal unused is represented by normal(UNDEFINED). Var reuse does not overwrite;
  absent nonextensible var creation itself is a normal no-op per §9.1.1.4.16.
  Callers must first use CanDeclare; these helpers do not perform instantiation.
  Function creation uses DefinePropertyOrThrow then Set(false), preserving flags
  on nonconfigurable properties. No VarNames bookkeeping.

`resolveStrictGlobalBinding(environment, name, loc)` returns a normal captured
`StrictGlobalReference` or the original ThrowCompletion. The reference contains
a readonly environment-or-null base, name, and copied call-site location.
`getStrictGlobalBinding(reference)` and `putStrictGlobalBinding(reference, value,
context)` use that base without resolution again; normal put returns unused.
The base is the composite environment, not a selected property/lexical cell.
Thus a later lexical binding can shadow a property for a captured resolved base;
an unresolved base stays unresolved. These are environment references, with
undefined call receiver, not the legacy Reference union or property references.

All completion-returning property operations forward original abrupt objects;
host faults propagate unchanged. No context is entered, no calls or ticks are
introduced. Host fault-injection subclasses test propagation, not exotic support.
No immutable/deletable lexical, sloppy public access, delete, with, proxy,
accessor, Realm bootstrap, entry/evaluator, multi-name precheck, declaration
instantiation, source G/L output or conformance is claimed.

Frozen literal host rows: H01 lexical TDZ/init/set/no property; H02 new/repeat var
and flags; H03 function creation/replacement; H04 lexical conflict inspection;
H05 restricted global inspection; H06 configurable shadow; H07 nonextensible
own/inherited/missing checks and creation no-op; H08 all eight W/E/C combinations;
H09 inherited reads/writes/undefined and own creation; H10 unresolved capture
before property/lexical mutation; H11 resolved capture after deletion/recreation
and lexical shadow; H12 global-this versus receiver and isolated environments/
Realm contexts; H13 original abrupt Has/Get/Set/Define records, locations/order;
H14 original host faults; H15 initialization and duplicate invariants. Runtime
input chooses row/name/value; expected values, flags, errors and traces are literal.
