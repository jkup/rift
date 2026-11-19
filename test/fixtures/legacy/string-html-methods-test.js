// Test Annex B String HTML methods (B.2.2)

console.log("=== Testing Annex B String HTML Methods ===");

var tests = [
    ["hello".anchor("name1"), '<a name="name1">hello</a>', "anchor"],
    ["hello".big(), "<big>hello</big>", "big"],
    ["hello".blink(), "<blink>hello</blink>", "blink"],
    ["hello".bold(), "<b>hello</b>", "bold"],
    ["hello".fixed(), "<tt>hello</tt>", "fixed"],
    ["hello".fontcolor("red"), '<font color="red">hello</font>', "fontcolor"],
    ["hello".fontsize(3), '<font size="3">hello</font>', "fontsize"],
    ["hello".italics(), "<i>hello</i>", "italics"],
    ["hello".link("http://x"), '<a href="http://x">hello</a>', "link"],
    ["hello".small(), "<small>hello</small>", "small"],
    ["hello".strike(), "<strike>hello</strike>", "strike"],
    ["hello".sub(), "<sub>hello</sub>", "sub"],
    ["hello".sup(), "<sup>hello</sup>", "sup"],
];

for (var i = 0; i < tests.length; i++) {
    if (tests[i][0] === tests[i][1]) {
        console.log("PASS:", tests[i][2]);
    } else {
        console.log("FAIL:", tests[i][2], "expected", tests[i][1], "got", tests[i][0]);
    }
}

// Quote escaping in attribute values
var escaped = "x".anchor('a"b');
if (escaped === '<a name="a&quot;b">x</a>') {
    console.log("PASS: anchor escapes quotes");
} else {
    console.log("FAIL: anchor quote escaping, got", escaped);
}

// No argument for attribute methods
var noArg = "x".anchor();
if (noArg === '<a name="undefined">x</a>') {
    console.log("PASS: anchor with no arg uses 'undefined'");
} else {
    console.log("FAIL: anchor no arg, got", noArg);
}

console.log("=== Annex B String HTML tests complete ===");
