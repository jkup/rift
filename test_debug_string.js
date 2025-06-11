// Debug string primitive boxing
console.log("Testing string primitive member access:");

// Test if we can access the method
var str = "hello";
console.log("str:", str);

// Try to access charAt method on string primitive
var method = str.charAt;
console.log("method:", method);

// Try to call it
console.log("Calling method:");
console.log(method(1));
