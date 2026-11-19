// While loop break behavior tests

console.log("=== While Loop Break Tests ===");

// Test 1: Simple break when reaching a threshold
var i = 0;
var iterations = 0;
while (true) {
  iterations = iterations + 1;
  if (i >= 5) {
    break;
  }
  i = i + 1;
}
if (i === 5 && iterations === 6) {
  console.log("PASS: while break exits loop at threshold");
} else {
  console.log("FAIL: while break threshold, i=", i, "iterations=", iterations);
}

// Test 2: Break on first iteration (reuse existing variable)
i = 0;
while (true) {
  i = i + 1; // mark entry
  break;
  i = i + 100; // should not execute
}
if (i === 1) {
  console.log("PASS: while break on first iteration stops immediately");
} else {
  console.log("FAIL: while break on first iteration, i=", i);
}

// Test 3: Nested while with inner break only breaking inner
var outer = 0;
var innerBreakCount = 0;
while (outer < 3) {
  var inner = 0;
  while (inner < 10) {
    innerBreakCount = innerBreakCount + 1;
    break; // should break only the inner loop
  }
  outer = outer + 1;
}
if (outer === 3 && innerBreakCount === 3) {
  console.log("PASS: inner while break does not break outer loop");
} else {
  console.log("FAIL: inner while break, outer=", outer, "innerBreakCount=", innerBreakCount);
}

// Test 4: Break inside switch should break the switch, not the loop
var count = 0;
var t = 0;
while (t < 3) {
  switch (t) {
    case 0:
      count = count + 1;
      break; // breaks switch only
    default:
      count = count + 1;
      break;
  }
  t = t + 1;
}
if (count === 3) {
  console.log("PASS: break inside switch does not break while loop");
} else {
  console.log("FAIL: switch break in while, count=", count);
}

console.log("=== While Loop Break Tests Complete ===");


