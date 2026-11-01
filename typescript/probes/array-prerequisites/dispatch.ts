// Compiler feasibility only: no guest array or conversion implementation.
type Result = { type: "normal"; value: boolean } | { type: "throw"; message: string };
type Box = { kind: "object"; object: Base } | { kind: "undefined" };
class Base {
    private slots: Map<string, number> = new Map();
    defineOwnProperty(key: string, value: number): Result {
        this.slots.set(key, value);
        return { type: "normal", value: true };
    }
    internalSet(key: string, value: number, receiver: Box): Result {
        if (receiver.kind !== "object") return { type: "normal", value: false };
        return receiver.object.defineOwnProperty(key, value);
    }
    read(key: string): number | undefined { return this.slots.get(key); }
}
class Special extends Base {
    calls = 0;
    override defineOwnProperty(key: string, value: number): Result {
        this.calls++;
        if (key === "throw") return { type: "throw", message: "expected" };
        if (key === "reject") return { type: "normal", value: false };
        return super.defineOwnProperty(key, value + 10);
    }
}
function check(condition: boolean, label: string): void {
    if (!condition) throw new Error(label);
}
const special = new Special();
const base: Base = special;
const receiver: Box = { kind: "object", object: base };
const ordinary = new Base();
const first = base.internalSet("self", 1, receiver);
check(first.type === "normal" && first.value && base.read("self") === 11, "inherited self Set");
const second = ordinary.internalSet("other", 2, receiver);
check(second.type === "normal" && second.value && base.read("other") === 12, "distinct receiver");
check(ordinary.read("other") === undefined, "lookup base unchanged");
const rejected = ordinary.internalSet("reject", 3, receiver);
check(rejected.type === "normal" && !rejected.value && base.read("reject") === undefined, "false");
const abrupt = ordinary.internalSet("throw", 4, receiver);
check(abrupt.type === "throw" && abrupt.message === "expected", "throw propagation");
const plain = ordinary.internalSet("plain", 5, { kind: "object", object: ordinary });
check(plain.type === "normal" && plain.value && ordinary.read("plain") === 5, "ordinary dispatch");
check(special.calls === 4, "exact override count");
console.log("dispatch: 7 expected assertions passed");
