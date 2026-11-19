// Test Error.isError

// Should return true for Error instances
if (Error.isError(new Error()) !== true) throw new Error("Error.isError(new Error()) should be true");
if (Error.isError(new TypeError()) !== true) throw new Error("Error.isError(new TypeError()) should be true");
if (Error.isError(new RangeError()) !== true) throw new Error("Error.isError(new RangeError()) should be true");
if (Error.isError(new SyntaxError()) !== true) throw new Error("Error.isError(new SyntaxError()) should be true");
if (Error.isError(new ReferenceError()) !== true) throw new Error("Error.isError(new ReferenceError()) should be true");
if (Error.isError(new EvalError()) !== true) throw new Error("Error.isError(new EvalError()) should be true");
if (Error.isError(new URIError()) !== true) throw new Error("Error.isError(new URIError()) should be true");

// Should return false for non-Error values
if (Error.isError({}) !== false) throw new Error("Error.isError({}) should be false");
if (Error.isError([]) !== false) throw new Error("Error.isError([]) should be false");
if (Error.isError(42) !== false) throw new Error("Error.isError(42) should be false");
if (Error.isError("error") !== false) throw new Error("Error.isError('error') should be false");
if (Error.isError(null) !== false) throw new Error("Error.isError(null) should be false");
if (Error.isError(undefined) !== false) throw new Error("Error.isError(undefined) should be false");
if (Error.isError(true) !== false) throw new Error("Error.isError(true) should be false");
if (Error.isError(function(){}) !== false) throw new Error("Error.isError(function) should be false");

// Should return false with no arguments
if (Error.isError() !== false) throw new Error("Error.isError() should be false");

// Function length should be 1
if (Error.isError.length !== 1) throw new Error("Error.isError.length should be 1, got " + Error.isError.length);

console.log("All Error.isError tests passed");
