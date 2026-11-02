type Completion = { type: "normal"; value: number };
type Callback = (a: number, b: number, c: number, d: number) => Completion;
function invoke(callback: Callback): Completion { return callback(1, 2, 3, 4); }
try {
    invoke((_a, _b, _c, _d) => { throw new Error("sentinel"); });
} catch {
    console.log("caught");
}
