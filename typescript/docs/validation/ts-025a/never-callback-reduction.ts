type Callback = (value: number) => number;
function invoke(callback: Callback): number { return callback(1); }
const callback: Callback = (_value) => { throw new Error("marker"); };
try { invoke(callback); } catch { console.log("caught"); }
