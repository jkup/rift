// Test: break and continue in for-of loops

// Test 1: break in for-of
var arr = [1, 2, 3, 4, 5];
var sum = 0;
for (var x of arr) {
    if (x === 4) break;
    sum = sum + x;
}
console.log(sum === 6);  // true (1+2+3)

// Test 2: continue in for-of
var arr2 = [1, 2, 3, 4, 5];
var sum2 = 0;
for (var x of arr2) {
    if (x === 3) continue;
    sum2 = sum2 + x;
}
console.log(sum2 === 12);  // true (1+2+4+5)

// Test 3: break on first element
var arr3 = [10, 20, 30];
var sum3 = 0;
for (var x of arr3) {
    if (x === 10) break;
    sum3 = sum3 + x;
}
console.log(sum3 === 0);  // true (nothing added before break)

// Test 4: continue all elements
var arr4 = [1, 2, 3];
var sum4 = 0;
for (var x of arr4) {
    continue;
    sum4 = sum4 + x;  // never reached
}
console.log(sum4 === 0);  // true

// Test 5: Multiple continues
var arr5 = [1, 2, 3, 4, 5, 6];
var sum5 = 0;
for (var x of arr5) {
    if (x % 2 === 0) continue;  // skip even numbers
    sum5 = sum5 + x;
}
console.log(sum5 === 9);  // true (1+3+5)

// Test 6: break with string
var str = 'abcdef';
var result = '';
for (var c of str) {
    if (c === 'd') break;
    result = result + c;
}
console.log(result === 'abc');  // true

// Test 7: continue with string
var str2 = 'hello';
var result2 = '';
for (var c of str2) {
    if (c === 'l') continue;  // skip 'l'
    result2 = result2 + c;
}
console.log(result2 === 'heo');  // true
