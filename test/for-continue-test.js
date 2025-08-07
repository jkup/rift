// For loop continue behavior tests

console.log("=== For Loop Continue Tests ===");

// Test 1: Sum only even indices
var sum = 0;
for (var i = 0; i < 6; i = i + 1) {
  if ((i % 2) == 1) {
    continue;
  }
  sum = sum + i;
}
if (sum === 0 + 2 + 4) {
  console.log("PASS: for continue skips odd indices");
} else {
  console.log("FAIL: for continue sum expected 6, got", sum);
}

// Test 2: Continue skips body but still runs update
var updates = 0;
for (var j = 0; j < 3; j = j + 1) {
  if (j === 0) {
    continue;
  }
  updates = updates + 1;
}
if (updates === 2) {
  console.log("PASS: for continue skips body but not update");
} else {
  console.log("FAIL: for continue update behavior, updates=", updates);
}

// Test 3: Nested loops with inner continue only
var outer = 0;
var innerCount = 0;
for (var a = 0; a < 2; a = a + 1) {
  outer = outer + 1;
  for (var b = 0; b < 3; b = b + 1) {
    if (b === 1) {
      continue;
    }
    innerCount = innerCount + 1;
  }
}
if (outer === 2 && innerCount === 4) {
  console.log("PASS: inner for continue behaves correctly");
} else {
  console.log("FAIL: inner for continue, outer=", outer, "innerCount=", innerCount);
}

console.log("=== For Loop Continue Tests Complete ===");


