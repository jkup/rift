// Test Math methods with negative numbers

// Test Math.abs
if (Math.abs(-5) == 5) console.log("PASS: Math.abs with negative number");
if (Math.abs(-5) != 5) console.log("FAIL: Math.abs with negative number");

if (Math.abs(5) == 5) console.log("PASS: Math.abs with positive number");
if (Math.abs(5) != 5) console.log("FAIL: Math.abs with positive number");

// Test Math.ceil
if (Math.ceil(-2.3) == -2) console.log("PASS: Math.ceil with negative number");
if (Math.ceil(-2.3) != -2) console.log("FAIL: Math.ceil with negative number");

if (Math.ceil(2.3) == 3) console.log("PASS: Math.ceil with positive number");
if (Math.ceil(2.3) != 3) console.log("FAIL: Math.ceil with positive number");

// Test Math.floor
if (Math.floor(-2.3) == -3)
  console.log("PASS: Math.floor with negative number");
if (Math.floor(-2.3) != -3)
  console.log("FAIL: Math.floor with negative number");

if (Math.floor(2.3) == 2) console.log("PASS: Math.floor with positive number");
if (Math.floor(2.3) != 2) console.log("FAIL: Math.floor with positive number");

// Test Math.round
if (Math.round(-2.7) == -3)
  console.log("PASS: Math.round with negative number");
if (Math.round(-2.7) != -3)
  console.log("FAIL: Math.round with negative number");

if (Math.round(2.7) == 3) console.log("PASS: Math.round with positive number");
if (Math.round(2.7) != 3) console.log("FAIL: Math.round with positive number");

// Test unary operators
if (-42 == -42) console.log("PASS: Unary minus");
if (-42 != -42) console.log("FAIL: Unary minus");

if (+42 == 42) console.log("PASS: Unary plus");
if (+42 != 42) console.log("FAIL: Unary plus");

// Test Math.sign
if (Math.sign(5) == 1) console.log("PASS: Math.sign with positive number");
if (Math.sign(5) != 1) console.log("FAIL: Math.sign with positive number");

if (Math.sign(-5) == -1) console.log("PASS: Math.sign with negative number");
if (Math.sign(-5) != -1) console.log("FAIL: Math.sign with negative number");

if (Math.sign(0) == 0) console.log("PASS: Math.sign with zero");
if (Math.sign(0) != 0) console.log("FAIL: Math.sign with zero");

// Test Math.trunc
if (Math.trunc(4.7) == 4) console.log("PASS: Math.trunc with positive decimal");
if (Math.trunc(4.7) != 4) console.log("FAIL: Math.trunc with positive decimal");

if (Math.trunc(-4.7) == -4)
  console.log("PASS: Math.trunc with negative decimal");
if (Math.trunc(-4.7) != -4)
  console.log("FAIL: Math.trunc with negative decimal");

if (Math.trunc(0) == 0) console.log("PASS: Math.trunc with zero");
if (Math.trunc(0) != 0) console.log("FAIL: Math.trunc with zero");
