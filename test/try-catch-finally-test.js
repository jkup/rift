console.log("Try/Catch/Finally tests");

// finally runs on normal completion
var a = 0;
try {
  a = 1;
} catch (e) {
  a = 2;
} finally {
  a = a + 10;
}
if (a === 11) {
  console.log("PASS: finally after normal try");
} else {
  console.log("FAIL: finally after normal try, a=", a);
}

// finally runs after caught exception
var b = 0;
try {
  throw "x";
} catch (e) {
  b = 3;
} finally {
  b = b + 10;
}
if (b === 13) {
  console.log("PASS: finally after catch");
} else {
  console.log("FAIL: finally after catch, b=", b);
}

// finally runs and exception rethrows if uncaught
var caught = false;
var c = 0;
try {
  try {
    c = 5;
    throw "boom";
  } finally {
    c = c + 1;
  }
} catch (e) {
  caught = true;
}
if (caught && c === 6) {
  console.log("PASS: finally ran and exception rethrown");
} else {
  console.log("FAIL: finally rethrow behavior, caught=", caught, "c=", c);
}


