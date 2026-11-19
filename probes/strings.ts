// Probe: whether host strings preserve guest UTF-16 semantics, including
// lone surrogates, which JavaScript strings may legally contain.

function codeUnits(s: string): string {
    const units: string[] = [];
    for (let i = 0; i < s.length; i++) units.push(s.charCodeAt(i).toString(16));
    return units.join(" ");
}

const pair = "😀"; // U+1F600 as a surrogate pair
const loneHigh = "\uD83D";
const loneLow = "\uDE00";
const withNul = "a\u0000b";

console.log("pair length:", pair.length, codeUnits(pair));
console.log("pair codePointAt:", pair.codePointAt(0)?.toString(16));
console.log("lone high:", loneHigh.length, codeUnits(loneHigh));
console.log("lone low:", loneLow.length, codeUnits(loneLow));
console.log("split pair:", codeUnits(pair.slice(0, 1)), "|", codeUnits(pair.slice(1)));
console.log("rejoined equals:", pair.slice(0, 1) + pair.slice(1) === pair);
console.log("nul:", withNul.length, codeUnits(withNul));
console.log("fromCharCode lone:", codeUnits(String.fromCharCode(0xd800, 0x41)));
console.log("compare units:", "￿" > pair, "a" < "b", "B" < "a");
console.log("indexOf lone low in pair:", pair.indexOf(loneLow));
console.log("concat lone halves:", (loneHigh + loneLow).length, loneHigh + loneLow === pair);
console.log("spread pair:", [...pair].length);
console.log("toUpperCase:", "straße".toUpperCase(), "İ".toLowerCase().length);
console.log("json lone:", JSON.stringify(loneHigh));

// Building a string one code unit at a time, as a lexer would.
let built = "";
for (const unit of [0x48, 0xd83d, 0xde00, 0xdc00, 0x21]) built += String.fromCharCode(unit);
console.log("built:", built.length, codeUnits(built));
