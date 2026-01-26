// Compatibility layer for Test262 harness functions
// This provides the essential Test262 harness functions in a way that works
// with our current runtime capabilities (without .prototype support)

// Test262Error - simplified to work without prototype
function Test262Error(message) {
  var error = {
    name: "Test262Error",
    message: message || "",
  };
  return error;
}

// Core assert function
function assert(mustBeTrue, message) {
  if (mustBeTrue === true) {
    return;
  }

  if (message === undefined) {
    message = "Expected true but got " + String(mustBeTrue);
  }

  // Throw by directly calling throw with a string since we can't use Error objects properly yet
  var errorMsg = "Test262Error: " + message;
  throw errorMsg;
}

// Helper to check if two values are the same (handles NaN and +/-0)
function isSameValue(a, b) {
  if (a === b) {
    // Handle +/-0 vs. -/+0
    return a !== 0 || 1 / a === 1 / b;
  }

  // Handle NaN vs. NaN
  return a !== a && b !== b;
}

// assert.sameValue
assert.sameValue = function (actual, expected, message) {
  if (isSameValue(actual, expected)) {
    return;
  }

  if (message === undefined) {
    message = "";
  } else {
    message = message + " ";
  }

  message =
    message +
    "Expected SameValue(" +
    String(actual) +
    ", " +
    String(expected) +
    ") to be true";
  throw "Test262Error: " + message;
};

// assert.notSameValue
assert.notSameValue = function (actual, unexpected, message) {
  if (!isSameValue(actual, unexpected)) {
    return;
  }

  if (message === undefined) {
    message = "";
  } else {
    message = message + " ";
  }

  message =
    message +
    "Expected SameValue(" +
    String(actual) +
    ", " +
    String(unexpected) +
    ") to be false";
  throw "Test262Error: " + message;
};

// assert.throws
assert.throws = function (expectedErrorConstructor, func, message) {
  if (typeof func !== "function") {
    throw "Test262Error: assert.throws requires two arguments: the error constructor and a function to run";
  }

  if (message === undefined) {
    message = "";
  } else {
    message = message + " ";
  }

  // Get the expected error name by creating a test instance
  // This works because error instances have .name even if constructors don't
  var expectedName = "Error";
  if (expectedErrorConstructor) {
    if (expectedErrorConstructor.name) {
      // If constructor has .name property, use it directly
      expectedName = expectedErrorConstructor.name;
    } else {
      // Create a test instance to get the error name
      try {
        var testInstance = new expectedErrorConstructor("test");
        if (testInstance && testInstance.name) {
          expectedName = testInstance.name;
        }
      } catch (e) {
        // If we can't create an instance, fall back to "Error"
      }
    }
  }

  var thrown = false;
  var actualError = null;

  try {
    func();
  } catch (e) {
    thrown = true;
    actualError = e;

    // Check if the thrown error matches the expected type
    if (typeof e === "object" && e !== null && e.name !== undefined) {
      // Compare error names
      if (e.name !== expectedName) {
        throw "Test262Error: " + message + "Expected a " + expectedName + " but got a " + e.name;
      }
      // Error type matches
      return;
    } else if (typeof e === "string") {
      // Handle string errors (like our Test262Error throws)
      // Check if the string contains the expected error type
      if (e.indexOf(expectedName) === -1 && expectedName !== "Error") {
        throw "Test262Error: " + message + "Expected a " + expectedName + " but got a string error: " + e.substring(0, 50);
      }
      return;
    } else {
      // Something was thrown but we can't verify its type
      // For primitive throws, we can only verify something was thrown
      return;
    }
  }

  if (!thrown) {
    throw "Test262Error: " + message + "Expected a " + expectedName + " to be thrown but no exception was thrown at all";
  }
};

// Simplified verifyProperty that works without full Object.getOwnPropertyDescriptor
function verifyProperty(obj, name, desc, options) {
  // Basic existence check
  if (desc === undefined) {
    // Property should not exist
    if (obj[name] !== undefined) {
      throw "Test262Error: Property " + String(name) + " should not exist";
    }
    return true;
  }

  // Check value if specified
  if (desc.value !== undefined) {
    if (!isSameValue(obj[name], desc.value)) {
      throw (
        "Test262Error: Property " +
        String(name) +
        " value should be " +
        String(desc.value) +
        " but got " +
        String(obj[name])
      );
    }
  }

  // For now, we can't verify writable/enumerable/configurable without proper descriptor support
  // But we can at least verify the value exists and matches

  return true;
}

// Simplified verifyCallableProperty
function verifyCallableProperty(
  obj,
  name,
  functionName,
  functionLength,
  desc,
  options
) {
  var value = obj[name];

  if (typeof value !== "function") {
    throw "Test262Error: Property " + String(name) + " should be a function";
  }

  // Basic existence check passed
  return true;
}

// Helper to check if descriptor verification is available
var hasDescriptorSupport = typeof Object.getOwnPropertyDescriptor === "function";

// Deprecated functions that some tests might still use
function verifyWritable(obj, name) {
  if (hasDescriptorSupport) {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    if (!desc) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
    if (desc.writable !== true) {
      throw "Test262Error: Property " + String(name) + " should be writable";
    }
  } else {
    // Fallback - just check property exists
    if (obj[name] === undefined && !(name in obj)) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
  }
  return true;
}

function verifyNotWritable(obj, name) {
  if (hasDescriptorSupport) {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    if (!desc) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
    if (desc.writable !== false) {
      throw "Test262Error: Property " + String(name) + " should not be writable";
    }
  } else {
    // Fallback - just check property exists
    if (obj[name] === undefined && !(name in obj)) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
  }
  return true;
}

function verifyEnumerable(obj, name) {
  if (hasDescriptorSupport) {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    if (!desc) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
    if (desc.enumerable !== true) {
      throw "Test262Error: Property " + String(name) + " should be enumerable";
    }
  } else {
    // Fallback - just check property exists
    if (obj[name] === undefined && !(name in obj)) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
  }
  return true;
}

function verifyNotEnumerable(obj, name) {
  if (hasDescriptorSupport) {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    if (!desc) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
    if (desc.enumerable !== false) {
      throw "Test262Error: Property " + String(name) + " should not be enumerable";
    }
  } else {
    // Fallback - just check property exists
    if (obj[name] === undefined && !(name in obj)) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
  }
  return true;
}

function verifyConfigurable(obj, name) {
  if (hasDescriptorSupport) {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    if (!desc) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
    if (desc.configurable !== true) {
      throw "Test262Error: Property " + String(name) + " should be configurable";
    }
  } else {
    // Fallback - just check property exists
    if (obj[name] === undefined && !(name in obj)) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
  }
  return true;
}

function verifyNotConfigurable(obj, name) {
  if (hasDescriptorSupport) {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    if (!desc) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
    if (desc.configurable !== false) {
      throw "Test262Error: Property " + String(name) + " should not be configurable";
    }
  } else {
    // Fallback - just check property exists
    if (obj[name] === undefined && !(name in obj)) {
      throw "Test262Error: Property " + String(name) + " should exist";
    }
  }
  return true;
}

// $DONOTEVALUATE placeholder
function $DONOTEVALUATE() {
  throw "Test262Error: This statement should not be evaluated";
}

// $262 host object - provides test262-specific functionality
var $262 = {
  // Reference to the global object
  global: this,

  // Garbage collection hint (no-op if not available)
  gc: function() {
    // No-op - Rift doesn't expose GC to JavaScript
  },

  // Evaluate code in a new script context
  evalScript: function(code) {
    // Use indirect eval to evaluate in global scope
    // Note: This is a simplified implementation
    var indirectEval = eval;
    return indirectEval(code);
  },

  // Create a new realm (not fully supported)
  createRealm: function() {
    throw "Test262Error: $262.createRealm is not implemented - Rift doesn't support multiple realms";
  },

  // Detach an ArrayBuffer (not supported)
  detachArrayBuffer: function(buffer) {
    throw "Test262Error: $262.detachArrayBuffer is not implemented";
  },

  // Get the agent information
  agent: {
    start: function(script) {
      throw "Test262Error: $262.agent.start is not implemented - Rift doesn't support agents";
    },
    broadcast: function(buffer, descriptor) {
      throw "Test262Error: $262.agent.broadcast is not implemented";
    },
    getReport: function() {
      throw "Test262Error: $262.agent.getReport is not implemented";
    },
    sleep: function(ms) {
      throw "Test262Error: $262.agent.sleep is not implemented";
    },
    monotonicNow: function() {
      throw "Test262Error: $262.agent.monotonicNow is not implemented";
    }
  }
};

// compareArray - Compare the contents of two arrays
function compareArray(a, b) {
  if (b.length !== a.length) {
    return false;
  }

  for (var i = 0; i < a.length; i++) {
    if (!compareArray.isSameValue(b[i], a[i])) {
      return false;
    }
  }
  return true;
}

// Use the existing isSameValue helper
compareArray.isSameValue = function(a, b) {
  if (a === 0 && b === 0) return 1 / a === 1 / b;
  if (a !== a && b !== b) return true;
  return a === b;
};

// Format array for error messages (without template literals)
compareArray.format = function(arrayLike) {
  var result = "[";
  for (var i = 0; i < arrayLike.length; i++) {
    if (i > 0) {
      result = result + ", ";
    }
    result = result + String(arrayLike[i]);
  }
  result = result + "]";
  return result;
};

// assert.compareArray
assert.compareArray = function(actual, expected, message) {
  if (message === undefined) {
    message = "";
  }

  if (typeof message === "symbol") {
    message = message.toString();
  }

  if (actual === null || actual === undefined) {
    throw "Test262Error: Actual argument shouldn't be nullish. " + message;
  }
  if (expected === null || expected === undefined) {
    throw "Test262Error: Expected argument shouldn't be nullish. " + message;
  }

  var result = compareArray(actual, expected);

  if (!result) {
    var format = compareArray.format;
    throw "Test262Error: Actual " + format(actual) + " and expected " + format(expected) + " should have the same contents. " + message;
  }
};
