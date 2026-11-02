type Result = { type: "normal"; value: number };
type Invoke = (value: number) => Result;
const invoke: Invoke = (_value): Result => { throw new Error("sentinel"); };
try {
    invoke(1);
} catch (error) {
    if (!(error instanceof Error) || error.message !== "sentinel") throw new Error("wrong error");
}
console.log("throw callback passed");
