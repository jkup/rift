// Test numeric separator validation

// Valid separators
if (1_000 === 1000) console.log("PASS: decimal separator");
else console.log("FAIL: decimal separator");

if (1_000_000 === 1000000) console.log("PASS: multiple decimal separators");
else console.log("FAIL: multiple decimal separators");

if (0xFF_FF === 0xFFFF) console.log("PASS: hex separator");
else console.log("FAIL: hex separator");

if (0b1010_0101 === 0b10100101) console.log("PASS: binary separator");
else console.log("FAIL: binary separator");

if (0o77_77 === 0o7777) console.log("PASS: octal separator");
else console.log("FAIL: octal separator");

if (1.5_2 === 1.52) console.log("PASS: fractional separator");
else console.log("FAIL: fractional separator");

if (1e1_0 === 1e10) console.log("PASS: exponent separator");
else console.log("FAIL: exponent separator");

// Invalid separators (each should throw an error when eval'd)
function expectError(code, desc) {
    try {
        eval(code);
        console.log("FAIL: " + desc + " should throw");
    } catch (e) {
        console.log("PASS: " + desc);
    }
}

expectError("1_", "trailing separator");
expectError("10__0", "consecutive separators");
expectError("10._1", "separator after dot");
expectError("10.0_e1", "separator before exponent");
expectError("0b0_", "trailing binary separator");
expectError("0b0__0", "consecutive binary separators");
expectError("0o0_", "trailing octal separator");
expectError("0x1_", "trailing hex separator");
expectError("00_0", "legacy octal separator");
expectError("0_0", "separator after leading zero");
expectError("08_0", "non-octal decimal separator");
