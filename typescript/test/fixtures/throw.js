function fail() { throw "stop"; }
fail();
console.log("unreachable");
