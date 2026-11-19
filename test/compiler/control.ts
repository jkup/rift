// Probe: guest control flow as data (completion records), host try/finally
// ordering, and host exceptions used only for implementation faults.
//
// Guest throws travel as Completion values by design, independently of host
// catch support. interpreter.ts also probes narrowing a host catch binding
// with instanceof Error, which compiles statically on the pinned toolchain.

type GuestValue = { kind: "number"; value: number } | { kind: "string"; value: string };

type Completion =
    | { type: "normal"; value: GuestValue }
    | { type: "return"; value: GuestValue }
    | { type: "throw"; value: GuestValue };

function str(value: string): GuestValue {
    return { kind: "string", value };
}

function show(c: Completion): string {
    const v = c.value.kind === "number" ? String(c.value.value) : c.value.value;
    return `${c.type}(${v})`;
}

// A guest throw propagating up 50 frames of recursive evaluation.
function guestThrower(depth: number): Completion {
    if (depth === 0) {
        return { type: "throw", value: str("from depth 0") };
    }
    const inner = guestThrower(depth - 1);
    if (inner.type !== "normal") {
        return inner;
    }
    return { type: "normal", value: { kind: "number", value: depth } };
}
console.log("propagated:", show(guestThrower(50)));

// Guest try/finally: a finally block's abrupt completion replaces the pending
// one; a normal finally completion leaves it in place (ECMA-262 §14.15.3).
function guestTryFinally(block: Completion, finalizer: Completion): Completion {
    return finalizer.type === "normal" ? block : finalizer;
}
console.log(
    "finally normal keeps throw:",
    show(guestTryFinally({ type: "throw", value: str("t") }, { type: "normal", value: str("f") })),
);
console.log(
    "finally return wins:",
    show(guestTryFinally({ type: "throw", value: str("t") }, { type: "return", value: str("f") })),
);

// Host try/finally ordering, which the evaluator will rely on for cleanup.
const log: string[] = [];
function hostFinally(): string {
    try {
        log.push("try");
        return "try";
    } finally {
        log.push("finally");
    }
}
console.log("host returned:", hostFinally(), log.join(" > "));

// Host exception for an implementation fault: caught at the top without
// inspecting the binding.
function fault(): number {
    throw new Error("internal fault");
}
let faulted = false;
try {
    fault();
} catch {
    faulted = true;
}
console.log("fault caught:", faulted);

function depth(n: number): number {
    return n === 0 ? 0 : 1 + depth(n - 1);
}
console.log("depth 5000:", depth(5000));
