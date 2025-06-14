// Basic arithmetic operations test

// Addition
var result1 = 2 + 3;
if (result1 == 5) console.log("PASS: Basic addition");
if (result1 != 5)
  console.log("FAIL: Basic addition - expected 5, got", result1);

var result2 = 0 + 0;
if (result2 == 0) console.log("PASS: Addition with zeros");
if (result2 != 0)
  console.log("FAIL: Addition with zeros - expected 0, got", result2);

// Subtraction
var result3 = 5 - 3;
if (result3 == 2) console.log("PASS: Basic subtraction");
if (result3 != 2)
  console.log("FAIL: Basic subtraction - expected 2, got", result3);

// Multiplication
var result4 = 3 * 4;
if (result4 == 12) console.log("PASS: Basic multiplication");
if (result4 != 12)
  console.log("FAIL: Basic multiplication - expected 12, got", result4);

// Division
var result5 = 10 / 2;
if (result5 == 5) console.log("PASS: Basic division");
if (result5 != 5)
  console.log("FAIL: Basic division - expected 5, got", result5);

// Operator precedence
var result6 = 2 + 3 * 4;
if (result6 == 14) console.log("PASS: Multiplication before addition");
if (result6 != 14)
  console.log(
    "FAIL: Multiplication before addition - expected 14, got",
    result6
  );

var result7 = (2 + 3) * 4;
if (result7 == 20) console.log("PASS: Parentheses override precedence");
if (result7 != 20)
  console.log(
    "FAIL: Parentheses override precedence - expected 20, got",
    result7
  );

// Variables
var result8 = 5 + 3;
if (result8 == 8) console.log("PASS: Variable addition");
if (result8 != 8)
  console.log("FAIL: Variable addition - expected 8, got", result8);
