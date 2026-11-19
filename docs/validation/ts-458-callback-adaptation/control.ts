type Value = { kind: "number"; value: number } | { kind: "undefined" };
type Completion = { type: "normal" | "return"; value: Value } | { type: "throw"; value: Value };
type Callback = (receiver: Value, args: Value[], context: { ticks: number }, loc: { line: number }) => Completion;
class Box { constructor(readonly invoke: Callback) {} }
function wrap(invoke: Callback): Box { return new Box(invoke); }
const abrupt = { type: "throw" as const, value: { kind: "number" as const, value: 1 } };
const callback = wrap((_receiver, _args, _context, _loc): Completion => abrupt);
console.log(callback.invoke({ kind: "undefined" }, [], { ticks: 0 }, { line: 1 }).type);
