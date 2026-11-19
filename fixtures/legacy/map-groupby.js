// Test Map.groupBy

// Basic grouping
var m = Map.groupBy([1, 2, 3, 4, 5, 6], function(v) {
    return v % 2 === 0 ? 'even' : 'odd';
});
if (!(m instanceof Map)) throw new Error("Expected Map instance");
var odd = m.get('odd');
var even = m.get('even');
if (odd.length !== 3) throw new Error("Expected 3 odd values, got " + odd.length);
if (even.length !== 3) throw new Error("Expected 3 even values, got " + even.length);
if (odd[0] !== 1 || odd[1] !== 3 || odd[2] !== 5) throw new Error("Wrong odd values");
if (even[0] !== 2 || even[1] !== 4 || even[2] !== 6) throw new Error("Wrong even values");

// Grouping with non-string keys (Map preserves key types)
var m2 = Map.groupBy([1, 2, 3, 4], function(v) {
    return v % 2;
});
if (m2.get(1).length !== 2) throw new Error("Expected 2 values for key 1");
if (m2.get(0).length !== 2) throw new Error("Expected 2 values for key 0");

// Empty iterable
var m3 = Map.groupBy([], function(v) { return v; });
if (m3.size !== 0) throw new Error("Expected empty map");

// TypeError for non-callable callback
try {
    Map.groupBy([1, 2], 42);
    throw new Error("Expected TypeError for non-function callback");
} catch (e) {
    if (!e.toString().includes("TypeError")) throw new Error("Wrong error type: " + e);
}

// TypeError for null/undefined items
try {
    Map.groupBy(null, function(v) { return v; });
    throw new Error("Expected TypeError for null items");
} catch (e) {
    if (!e.toString().includes("TypeError")) throw new Error("Wrong error type: " + e);
}

console.log("All Map.groupBy tests passed");
