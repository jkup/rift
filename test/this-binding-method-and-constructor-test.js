console.log("=== this binding: methods and constructors ===");

// Constructor should receive proper `this`
function C(x) {
  this.x = x;
}

var c = new C(42);
if (c && c.x === 42) {
  console.log("✅ constructor this bound correctly");
} else {
  console.log("❌ constructor this binding failed");
}

// Method call should bind receiver as `this`
var obj = {
  v: 10,
  inc: function (d) { this.v = this.v + d; return this.v; }
};

var r1 = obj.inc(5);
if (r1 === 15 && obj.v === 15) {
  console.log("✅ method this bound correctly");
} else {
  console.log("❌ method this binding failed");
}

// Array callback should receive element as first arg and not corrupt receiver semantics
var arr = [1,2,3];
var sum = 0;
arr.forEach(function(el){ sum = sum + el; });
if (sum === 6) {
  console.log("✅ callback arguments intact");
} else {
  console.log("❌ callback arguments incorrect");
}


