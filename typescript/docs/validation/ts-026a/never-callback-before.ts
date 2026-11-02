type Result = { type: "normal"; value: number };
type Invoke = (receiver: number, args: number[], context: number, loc: number) => Result;
class Callable {
    constructor(readonly slot: { invoke: Invoke }) {}
}
const callable = new Callable({ invoke: (_r, _a, _c, _l) => { throw new Error("unused"); } });
console.log(callable.slot !== null);
