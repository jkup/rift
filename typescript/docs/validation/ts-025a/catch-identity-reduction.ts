const marker = new Error("marker");
let caught = false;
try { throw marker; } catch (err) { caught = err === marker; }
console.log(caught);
