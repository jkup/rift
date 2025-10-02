// Test: GC Leak Test
// Check if objects without GCProtector leak as permanent roots

console.log("=== GC Leak Test ===\n");

// Create many objects without explicit GCProtector
// They should still be garbage collected when unreachable

for (let i = 0; i < 1000; i++) {
  let temp = { value: i }; // Object should be collectible when loop ends
}

console.log("Created 1000 temporary objects");

// Create objects that remain reachable
let permanent = [];
for (let j = 0; j < 10; j++) {
  permanent.push({ value: j });
}

console.log("Created 10 permanent objects in array");
console.log(
  "Test complete - if GC is working, temporary objects should be collected"
);
