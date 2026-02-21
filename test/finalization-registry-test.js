// FinalizationRegistry tests

// Test 1: Basic construction
var callback = function(heldValue) {
    console.log("Cleanup called with:", heldValue);
};
var fr = new FinalizationRegistry(callback);
console.log("FinalizationRegistry created:", fr !== null && fr !== undefined);

// Test 2: TypeError for non-callable callback
var threw = false;
try {
    new FinalizationRegistry(42);
} catch (e) {
    threw = true;
    console.log("FR rejects number callback:", e.toString().indexOf("TypeError") !== -1);
}
console.log("FR threw for non-callable:", threw);

// Test 3: TypeError for string callback
threw = false;
try {
    new FinalizationRegistry("hello");
} catch (e) {
    threw = true;
}
console.log("FR threw for string callback:", threw);

// Test 4: TypeError for undefined callback
threw = false;
try {
    new FinalizationRegistry();
} catch (e) {
    threw = true;
}
console.log("FR threw for undefined callback:", threw);

// Test 5: register with valid target
var target = { name: "test" };
var result = fr.register(target, "held value");
console.log("FR register returns undefined:", result === undefined);

// Test 6: register with unregisterToken
var token = {};
result = fr.register({ name: "test2" }, "held2", token);
console.log("FR register with token returns undefined:", result === undefined);

// Test 7: TypeError for non-object target in register
threw = false;
try {
    fr.register(42, "held");
} catch (e) {
    threw = true;
    console.log("FR register rejects number target:", e.toString().indexOf("TypeError") !== -1);
}
console.log("FR register threw for non-object target:", threw);

// Test 8: TypeError when target === heldValue
threw = false;
try {
    var obj = {};
    fr.register(obj, obj);
} catch (e) {
    threw = true;
}
console.log("FR register threw for target === heldValue:", threw);

// Test 9: unregister with valid token
var unregToken = {};
var target3 = {};
fr.register(target3, "held3", unregToken);
var removed = fr.unregister(unregToken);
console.log("FR unregister returns boolean:", typeof removed === "boolean");
console.log("FR unregister found token:", removed === true);

// Test 10: unregister with non-matching token
var otherToken = {};
removed = fr.unregister(otherToken);
console.log("FR unregister no match returns false:", removed === false);

// Test 11: TypeError for non-object unregisterToken
threw = false;
try {
    fr.unregister(42);
} catch (e) {
    threw = true;
}
console.log("FR unregister threw for non-object token:", threw);

// Test 12: @@toStringTag
console.log("FR toStringTag:", Object.prototype.toString.call(fr) === "[object FinalizationRegistry]");

// Test 13: constructor property
console.log("FR constructor:", fr.constructor === FinalizationRegistry);

// Test 14: register accepts function as target
var fnTarget = function() {};
result = fr.register(fnTarget, "fn-held");
console.log("FR register accepts function target:", result === undefined);

// Test 15: heldValue can be a primitive
result = fr.register({}, 42);
console.log("FR register accepts primitive heldValue:", result === undefined);

console.log("All FinalizationRegistry tests completed!");
