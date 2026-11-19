const fault = new Error("sentinel");
let caught: unknown = null;
try { throw fault; } catch (value) { caught = value; }
console.log(caught === fault);
