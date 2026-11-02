const expected = new Error("identity");
let caught = false;
try { throw expected; } catch (value) { caught = value === expected; }
if (!caught) { throw new Error("wrong identity"); }
console.log("identity ok");
