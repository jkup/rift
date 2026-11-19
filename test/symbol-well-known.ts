import { Realm } from "../src/realm.js";
import { sameValue, type Value } from "../src/runtime.js";
import {
    wellKnownAsyncDispose,
    wellKnownAsyncIterator,
    wellKnownDispose,
    wellKnownHasInstance,
    wellKnownIsConcatSpreadable,
    wellKnownIterator,
    wellKnownMatch,
    wellKnownMatchAll,
    wellKnownReplace,
    wellKnownSearch,
    wellKnownSpecies,
    wellKnownSplit,
    wellKnownToPrimitive,
    wellKnownToStringTag,
    wellKnownUnscopables,
} from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, configurable: true });
}
const a = new Realm((_line: string) => {}, "script"),
    b = new Realm((_line: string) => {}, "script");
const entries = [
    { name: "asyncDispose", symbol: wellKnownAsyncDispose },
    { name: "asyncIterator", symbol: wellKnownAsyncIterator },
    { name: "dispose", symbol: wellKnownDispose },
    { name: "hasInstance", symbol: wellKnownHasInstance },
    { name: "isConcatSpreadable", symbol: wellKnownIsConcatSpreadable },
    { name: "iterator", symbol: wellKnownIterator },
    { name: "match", symbol: wellKnownMatch },
    { name: "matchAll", symbol: wellKnownMatchAll },
    { name: "replace", symbol: wellKnownReplace },
    { name: "search", symbol: wellKnownSearch },
    { name: "species", symbol: wellKnownSpecies },
    { name: "split", symbol: wellKnownSplit },
    { name: "toPrimitive", symbol: wellKnownToPrimitive },
    { name: "toStringTag", symbol: wellKnownToStringTag },
    { name: "unscopables", symbol: wellKnownUnscopables },
];
const foreign = a.globalObject.getOwnProperty("Symbol");
if (foreign === undefined || foreign.kind !== "data") {
    throw new Error("Symbol factory");
}
seed(b, "foreign", foreign.value);
for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    check(entry.symbol.description === "Symbol." + entry.name, "literal description " + entry.name);
    for (let j = 0; j < i; j++) {
        check(entries[j].symbol !== entry.symbol, "distinct identities");
    }
    seed(b, "name", { kind: "string", value: entry.name });
    seed(b, "expected", { kind: "symbol", value: entry.symbol });
    for (const text of [
        "typeof Symbol[name]==='symbol'&&Symbol[name]===expected&&foreign[name]===expected;",
        "Symbol[name].description==='Symbol.'+name&&Symbol[name].toString()==='Symbol(Symbol.'+name+')';",
        "Symbol.keyFor(Symbol[name])===undefined&&Symbol.for('Symbol.'+name)!==Symbol[name]&&Symbol('Symbol.'+name)!==Symbol[name];",
        "let d=Object.getOwnPropertyDescriptor(Symbol,name);d.value===expected&&!d.writable&&!d.enumerable&&!d.configurable;",
        "Symbol[name]=7;Symbol[name]===expected&&delete Symbol[name]===false;",
        "Object.defineProperty(Symbol,name,{value:expected})===Symbol;",
        "try{Object.defineProperty(Symbol,name,{value:7});}catch(e){e instanceof TypeError&&Symbol[name]===expected;}",
        "let o={};o[expected]=7;o['Symbol.'+name]=8;Object.getOwnPropertySymbols(o)[0]===expected&&o[expected]===7&&Object.keys(o)[0]==='Symbol.'+name;",
    ]) {
        const prepared = prepareBoundedScript({ id: entry.name, text: "{" + text + "}" }, b);
        if (prepared.kind !== "ready") {
            throw new Error("prepare " + text);
        }
        const result = evaluateScript(
            createScriptSession({ maxSteps: 10000, maxCalls: 64 }),
            prepared.record,
        ).completion;
        check(
            result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
            entry.name + ": " + text,
        );
    }
}
check(
    new Realm((_line: string) => {}).global.bindings.has("Symbol") === false,
    "legacy global absent",
);
console.log("Well-known symbols passed");
