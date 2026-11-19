// For loop break behavior tests

console.log("=== For Loop Break Tests ===");

// Test 1: Break mid-iteration
var sum = 0;
for (var i = 0; i < 10; i = i + 1) {
  if (i === 4) {
    break;
  }
  sum = sum + i;
}
// i took values 0,1,2,3 then broke at 4 => sum = 6
if (sum === 6) {
  console.log("PASS: for break exits loop mid-iteration");
} else {
  console.log("FAIL: for break mid-iteration, sum=", sum);
}

// Test 2: Break immediately
var ran = false;
for (var j = 0; j < 5; j = j + 1) {
  break;
  ran = true;
}
if (!ran) {
  console.log("PASS: for break on first iteration stops immediately");
} else {
  console.log("FAIL: for break on first iteration");
}

// Test 3: Nested for loops with inner break only
var outerCount = 0;
var innerBreakCount = 0;
for (var a = 0; a < 4; a = a + 1) {
  outerCount = outerCount + 1;
  for (var b = 0; b < 100; b = b + 1) {
    innerBreakCount = innerBreakCount + 1;
    break; // only break inner loop
  }
}
if (outerCount === 4 && innerBreakCount === 4) {
  console.log("PASS: inner for break does not break outer loop");
} else {
  console.log("FAIL: inner for break, outerCount=", outerCount, "innerBreakCount=", innerBreakCount);
}

// Test 4: Break inside switch does not break for loop
var count = 0;
for (var t = 0; t < 3; t = t + 1) {
  switch (t) {
    case 0:
      count = count + 1;
      break; // breaks switch only
    default:
      count = count + 1;
      break;
  }
}
if (count === 3) {
  console.log("PASS: break inside switch does not break for loop");
} else {
  console.log("FAIL: switch break in for, count=", count);
}

console.log("=== For Loop Break Tests Complete ===");


