// While loop continue behavior tests

console.log("=== While Loop Continue Tests ===");

// Test 1: Skip odd numbers using continue
var i = 0;
var evens = 0;
while (i < 6) {
  i = i + 1;
  if ((i % 2) == 1) {
    continue;
  }
  evens = evens + 1;
}
if (evens === 3) {
  console.log("PASS: while continue skips odd iterations");
} else {
  console.log("FAIL: while continue expected 3 evens, got", evens);
}

// Test 2: Continue on first iteration only
var ranCount = 0;
var j = 0;
while (j < 2) {
  if (j === 0) {
    j = j + 1;
    continue;
  }
  ranCount = ranCount + 1;
  j = j + 1;
}
if (ranCount === 1) {
  console.log("PASS: while continue on first iteration works");
} else {
  console.log("FAIL: while continue on first iteration, ranCount=", ranCount);
}

// Test 3: Nested continue only affects inner loop
var outer = 0;
var innerExec = 0;
while (outer < 2) {
  var inner = 0;
  while (inner < 3) {
    inner = inner + 1;
    if (inner === 1) {
      continue;
    }
    innerExec = innerExec + 1;
  }
  outer = outer + 1;
}
if (innerExec === 4) {
  console.log("PASS: inner continue does not skip outer iteration");
} else {
  console.log("FAIL: inner continue, innerExec=", innerExec);
}

console.log("=== While Loop Continue Tests Complete ===");


