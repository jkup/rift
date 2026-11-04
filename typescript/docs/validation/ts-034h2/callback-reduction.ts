type Completion = { type: "normal"; value: number } | { type: "throw"; value: number };
type Context = { call: (callee: number, receiver: number, args: number[], loc: number) => Completion };
function context(): Context {
    return { call: (_callee, _receiver, _args, _loc) => { throw new Error("setup cannot call"); } };
}
const c = context();
try { c.call(1, 2, [], 3); } catch (error) { if (!(error instanceof Error)) throw error; console.log(error.message); }
