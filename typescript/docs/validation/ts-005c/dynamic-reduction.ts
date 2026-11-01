type Value = { kind: "undefined" } | { kind: "object"; object: Box };
class Box {}
type Result = { type: "normal"; value: Value };
type Callback = (value: Value, args: Value[]) => Result;
function invoke(callback: Callback, value: Value, args: Value[]): Result { return callback(value, args); }
const value: Value = { kind: "object", object: new Box() };
const args = [value];
const fault = new Error("sentinel");
try {
    invoke((actual, actualArgs) => {
        if (actualArgs !== args) throw new Error("identity");
        return { type: "normal", value: actual };
    }, value, args);
    invoke((_actual, _args) => { throw fault; }, value, args);
} catch (error) {
    if (error !== fault) throw new Error("fault");
}
console.log("reduction passed");
