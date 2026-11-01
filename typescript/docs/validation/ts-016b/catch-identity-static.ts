const fault = new Error("sentinel");
let caught = false;
try { throw fault; } catch (x) { caught = x instanceof Error && x === fault; }
console.log(caught);
