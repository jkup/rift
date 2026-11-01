const fault = new Error("sentinel");
let caught = false;
try { throw fault; } catch (x) { caught = x === fault; }
console.log(caught);
