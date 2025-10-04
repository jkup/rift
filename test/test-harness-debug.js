// Test if we can create Test262Error constructor
function Test262Error(message) {
  this.message = message || "";
}

Test262Error.prototype.toString = function () {
  return "Test262Error: " + this.message;
};

// Test creating an instance
var err = new Test262Error("test message");
console.log("Created error: " + err.toString());
console.log("Message: " + err.message);

// Test throw
try {
  throw new Test262Error("thrown error");
} catch (e) {
  console.log("Caught: " + e.message);
}

console.log("Test262Error constructor works!");
