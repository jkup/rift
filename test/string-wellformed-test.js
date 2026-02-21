// Tests for String.prototype.isWellFormed and String.prototype.toWellFormed

function assert(condition, message) {
    if (condition) {
        console.log("PASS: " + message);
    } else {
        console.log("FAIL: " + message);
    }
}

// isWellFormed basic tests
assert(typeof String.prototype.isWellFormed === 'function', 'isWellFormed is a function');
assert(typeof String.prototype.toWellFormed === 'function', 'toWellFormed is a function');
assert('abc'.isWellFormed() === true, 'ASCII string is well-formed');
assert(''.isWellFormed() === true, 'empty string is well-formed');
assert('a\u25A8c'.isWellFormed() === true, 'non-ASCII BMP character is well-formed');

// isWellFormed with surrogates
var leadingSurrogate = '\uD83D';
var trailingSurrogate = '\uDCA9';
assert(leadingSurrogate.isWellFormed() === false, 'lone leading surrogate is not well-formed');
assert(trailingSurrogate.isWellFormed() === false, 'lone trailing surrogate is not well-formed');
assert((leadingSurrogate + trailingSurrogate).isWellFormed() === true, 'valid surrogate pair is well-formed');
assert(('a' + leadingSurrogate + 'c').isWellFormed() === false, 'lone leading surrogate in middle is not well-formed');
assert(('a' + trailingSurrogate + 'c').isWellFormed() === false, 'lone trailing surrogate in middle is not well-formed');
assert(('a' + trailingSurrogate + leadingSurrogate + 'd').isWellFormed() === false, 'wrong-ordered surrogate pair is not well-formed');

// toWellFormed basic tests
var replacementChar = '\uFFFD';
assert('abc'.toWellFormed() === 'abc', 'ASCII string unchanged by toWellFormed');
assert(''.toWellFormed() === '', 'empty string unchanged by toWellFormed');
assert('a\u25A8c'.toWellFormed() === 'a\u25A8c', 'non-ASCII BMP character unchanged by toWellFormed');

// toWellFormed with surrogates
assert(leadingSurrogate.toWellFormed() === replacementChar, 'lone leading surrogate replaced with U+FFFD');
assert(trailingSurrogate.toWellFormed() === replacementChar, 'lone trailing surrogate replaced with U+FFFD');
assert((leadingSurrogate + trailingSurrogate).toWellFormed() === leadingSurrogate + trailingSurrogate, 'valid surrogate pair preserved by toWellFormed');
assert(('a' + leadingSurrogate + 'c').toWellFormed() === 'a' + replacementChar + 'c', 'lone leading surrogate in middle replaced');
assert(('a' + trailingSurrogate + leadingSurrogate + 'd').toWellFormed() === 'a' + replacementChar + replacementChar + 'd', 'wrong-ordered surrogates both replaced');

// TypeError for null/undefined
var threw = false;
try { String.prototype.isWellFormed.call(undefined); } catch(e) { threw = true; }
assert(threw === true, 'isWellFormed throws on undefined');

threw = false;
try { String.prototype.isWellFormed.call(null); } catch(e) { threw = true; }
assert(threw === true, 'isWellFormed throws on null');

threw = false;
try { String.prototype.toWellFormed.call(undefined); } catch(e) { threw = true; }
assert(threw === true, 'toWellFormed throws on undefined');

threw = false;
try { String.prototype.toWellFormed.call(null); } catch(e) { threw = true; }
assert(threw === true, 'toWellFormed throws on null');
