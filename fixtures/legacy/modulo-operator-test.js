console.log("Modulo operator tests");

// Basic positives
if ((5 % 2) === 1) {
  console.log("PASS: 5 % 2 === 1");
} else {
  console.log("FAIL: 5 % 2 !== 1, got", 5 % 2);
}

// Negative dividend
if ((-5 % 2) === -1) {
  console.log("PASS: -5 % 2 === -1");
} else {
  console.log("FAIL: -5 % 2 !== -1, got", -5 % 2);
}

// Negative divisor
if ((5 % -2) === 1) {
  console.log("PASS: 5 % -2 === 1");
} else {
  console.log("FAIL: 5 % -2 !== 1, got", 5 % -2);
}

// Floating point
var r = 5.5 % 2;
if (r === 1.5) {
  console.log("PASS: 5.5 % 2 === 1.5");
} else {
  console.log("FAIL: 5.5 % 2 !== 1.5, got", r);
}

// Zero dividend
if ((0 % 5) === 0) {
  console.log("PASS: 0 % 5 === 0");
} else {
  console.log("FAIL: 0 % 5 !== 0, got", 0 % 5);
}


