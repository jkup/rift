// Test: for-of with strings (iterate characters)

// Test 1: Collect all characters
var str = 'hello';
var chars = [];
for (var c of str) {
    chars.push(c);
}
console.log(chars.length === 5);  // true
console.log(chars[0] === 'h');  // true
console.log(chars[1] === 'e');  // true
console.log(chars[2] === 'l');  // true
console.log(chars[3] === 'l');  // true
console.log(chars[4] === 'o');  // true

// Test 2: String concatenation via for-of
var word = 'abc';
var reversed = '';
for (var ch of word) {
    reversed = ch + reversed;
}
console.log(reversed === 'cba');  // true

// Test 3: Empty string
var empty = '';
var count = 0;
for (var x of empty) {
    count = count + 1;
}
console.log(count === 0);  // true

// Test 4: Single character string
var single = 'X';
var result = '';
for (var s of single) {
    result = result + s;
}
console.log(result === 'X');  // true

// Test 5: String with spaces
var spaced = 'a b';
var collected = [];
for (var c of spaced) {
    collected.push(c);
}
console.log(collected.length === 3);  // true
console.log(collected[0] === 'a');  // true
console.log(collected[1] === ' ');  // true
console.log(collected[2] === 'b');  // true
