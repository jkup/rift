// Test global URI encoding/decoding functions (ECMA-262 §19.2.6)

// === encodeURI ===

// Basic encoding - encodeURI does NOT encode reserved URI characters
if (encodeURI("https://example.com/path?q=hello world#frag") !== "https://example.com/path?q=hello%20world#frag") {
    throw new Error("encodeURI should encode spaces but preserve reserved chars");
}

// Characters that should NOT be encoded by encodeURI
// uriReserved: ; / ? : @ & = + $ ,
// uriUnescaped: A-Z a-z 0-9 - _ . ! ~ * ' ( )
// Also: #
if (encodeURI(";/?:@&=+$,#") !== ";/?:@&=+$,#") {
    throw new Error("encodeURI should not encode uriReserved or #");
}
if (encodeURI("ABCabc019") !== "ABCabc019") {
    throw new Error("encodeURI should not encode alphanumeric chars");
}
if (encodeURI("-_.!~*'()") !== "-_.!~*'()") {
    throw new Error("encodeURI should not encode uriUnescaped special chars");
}

// Characters that SHOULD be encoded
if (encodeURI(" ") !== "%20") throw new Error("encodeURI should encode space");
if (encodeURI("^") !== "%5E") throw new Error("encodeURI should encode ^");
if (encodeURI("{") !== "%7B") throw new Error("encodeURI should encode {");
if (encodeURI("}") !== "%7D") throw new Error("encodeURI should encode }");
if (encodeURI("|") !== "%7C") throw new Error("encodeURI should encode |");

// === encodeURIComponent ===

// encodeURIComponent encodes everything except uriUnescaped
if (encodeURIComponent("hello world") !== "hello%20world") {
    throw new Error("encodeURIComponent should encode spaces");
}
if (encodeURIComponent("/") !== "%2F") {
    throw new Error("encodeURIComponent should encode /");
}
if (encodeURIComponent("?") !== "%3F") {
    throw new Error("encodeURIComponent should encode ?");
}
if (encodeURIComponent("#") !== "%23") {
    throw new Error("encodeURIComponent should encode #");
}
if (encodeURIComponent("&") !== "%26") {
    throw new Error("encodeURIComponent should encode &");
}
if (encodeURIComponent("=") !== "%3D") {
    throw new Error("encodeURIComponent should encode =");
}

// uriUnescaped should NOT be encoded
if (encodeURIComponent("-_.!~*'()") !== "-_.!~*'()") {
    throw new Error("encodeURIComponent should not encode uriUnescaped special chars");
}

// === decodeURI ===

// decodeURI decodes everything except uriReserved + #
if (decodeURI("hello%20world") !== "hello world") {
    throw new Error("decodeURI should decode %20 to space");
}

// Reserved characters should NOT be decoded
if (decodeURI("%3B%2F%3F%3A%40%26%3D%2B%24%2C%23") !== "%3B%2F%3F%3A%40%26%3D%2B%24%2C%23") {
    throw new Error("decodeURI should not decode reserved characters");
}

// === decodeURIComponent ===

// decodeURIComponent decodes everything
if (decodeURIComponent("hello%20world") !== "hello world") {
    throw new Error("decodeURIComponent should decode %20");
}
if (decodeURIComponent("%3B%2F%3F%3A%40%26%3D%2B%24%2C%23") !== ";/?:@&=+$,#") {
    throw new Error("decodeURIComponent should decode all reserved characters");
}

// === Roundtrip tests ===

var testStrings = [
    "hello world",
    "foo@bar.com",
    "path/to/file",
    "a=1&b=2",
    "100%",
];

for (var i = 0; i < testStrings.length; i++) {
    var s = testStrings[i];
    if (decodeURIComponent(encodeURIComponent(s)) !== s) {
        throw new Error("encodeURIComponent/decodeURIComponent roundtrip failed for: " + s);
    }
}

// === Error handling ===

// Malformed sequences should throw URIError
try {
    decodeURIComponent("%");
    throw new Error("Should have thrown URIError for lone %");
} catch (e) {
    if (String(e).indexOf("URIError") === -1) throw new Error("Expected URIError, got: " + e);
}

try {
    decodeURIComponent("%G0");
    throw new Error("Should have thrown URIError for invalid hex");
} catch (e) {
    if (String(e).indexOf("URIError") === -1) throw new Error("Expected URIError, got: " + e);
}

try {
    decodeURIComponent("%C0");  // Incomplete 2-byte sequence
    throw new Error("Should have thrown URIError for incomplete multibyte");
} catch (e) {
    if (String(e).indexOf("URIError") === -1) throw new Error("Expected URIError, got: " + e);
}

// === Function properties ===

if (encodeURI.length !== 1) throw new Error("encodeURI.length should be 1");
if (encodeURIComponent.length !== 1) throw new Error("encodeURIComponent.length should be 1");
if (decodeURI.length !== 1) throw new Error("decodeURI.length should be 1");
if (decodeURIComponent.length !== 1) throw new Error("decodeURIComponent.length should be 1");

if (encodeURI.name !== "encodeURI") throw new Error("encodeURI.name should be 'encodeURI'");
if (encodeURIComponent.name !== "encodeURIComponent") throw new Error("encodeURIComponent.name wrong");
if (decodeURI.name !== "decodeURI") throw new Error("decodeURI.name should be 'decodeURI'");
if (decodeURIComponent.name !== "decodeURIComponent") throw new Error("decodeURIComponent.name wrong");

console.log("All URI encoding/decoding tests passed!");
