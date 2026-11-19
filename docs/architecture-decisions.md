# Architecture and extension boundaries

## Current reading guide

Rift interprets guest source at runtime. The
same TypeScript implementation runs under Node and compiles to native code with
scriptc; neither route delegates guest execution to the host JavaScript engine.

Follow a CLI program through these modules:

| Module | Responsibility |
|---|---|
| `src/cli.ts` | Reads source, creates a Script Realm, prepares the program and evaluates it in a fresh session. Owns console output, diagnostics and exit codes. |
| `src/lexer.ts`, `src/parser.ts`, `src/syntax.ts` | Tokenize and parse the supported grammar into located syntax nodes. Script metadata and declaration analysis establish strictness and binding rules before execution. |
| `src/script-record.ts` | Exposes `prepareBoundedScript`. Successful preparation produces an opaque executable record tied to its source and Realm. Rejected preparation does not execute guest code. |
| `src/script-execution.ts` | Exposes `createScriptSession` and `evaluateScript`. The session tracks execution limits and active calls; evaluation distinguishes declaration-instantiation failure from body completion. |
| `src/script-execution-internal.ts` | Implements record preparation, declaration instantiation, function materialization and tree-walking execution. The two small public modules above are facades over this implementation. |
| `src/script-environment.ts`, `src/global-environment.ts` | Resolve local/function bindings and the global object/declarative environment. References retain strictness and receiver information for later reads, writes and calls. |
| `src/realm.ts`, `src/builtins/` | Allocate each Realm's intrinsics and implement guest builtins through shared object operations and explicit completions. |

`runtime.ts` defines tagged values and ordinary guest objects. Values include
exact BigInt and symbols; property keys are strings or symbols. Objects support prototype lookup,
data and accessor descriptors, extensibility and deletion. Callable objects keep
ordinary object identity. `array-object.ts` specializes property definition for
array indices and length; sparse elements remain properties rather than a dense
host array.

Operations that can invoke guest code receive an `OperationContext`. Property
access and primitive conversion may call getters, setters or conversion methods,
so evaluation order matters even inside a builtin. Explicit completion records
carry guest control flow and errors; host exceptions indicate implementation or
host-adapter faults. Builtin loops must charge the shared execution budget.

Generators and async execution preserve explicit suspended evaluation state in
the Script evaluator and the generator/async helper modules. Resume paths restore
the defining Realm and use the active session's budgets. Read
[the suspension boundary](design/generator-boundary.md) before extending these paths.
Promise reactions enqueue jobs with a defining Realm in the session queue;
the CLI calls drainScriptJobs after
evaluation rather than delegating scheduling to host promises.

The CLI follows Script directives for strict/sloppy behavior. This is still a
bounded language implementation: see the [feature inventory](feature-inventory.md)
for supported syntax and APIs. `interpreter.ts`, the legacy `Evaluator` interface
and the old observation path remain for earlier host tests and tooling; their
migration is unfinished. New CLI features should use the Script path above.

For a small builtin example, read `builtins/array-mutation.ts` alongside
[its operation-order tests](../test/array-mutation.ts). Validate semantic changes
in both hosts and retain the native static-coverage gate.

Earlier milestone histories are available in Git at `150d2625:docs/architecture-decisions.md`.

<a id="primitive-numeric-operators-ts-008"></a>
<a id="functionprototypecall-ts-016b"></a>
Historical section links refer to that archived version.
