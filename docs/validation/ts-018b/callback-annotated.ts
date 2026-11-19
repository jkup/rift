type Completion = { type: "normal"; value: number } | { type: "throw"; message: string };
type Callback = (receiver: number, args: number[], context: number, loc: number) => Completion;
function keep(callback: Callback): Callback { return callback; }
const callback = keep((_receiver, _args, _context, _loc): Completion => { throw new Error("sentinel"); });
try {
    callback(0, [], 0, 0);
} catch {
    console.log("caught");
}
