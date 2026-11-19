import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}

function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}

function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "codepoints", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "restored session");
    return result;
}

function expect(result: ValueCompletion, value: Value, label: string): void {
    check(result.type === "normal" && sameValue(result.value, value), label);
}

function passes(text: string): void {
    for (const prefix of ["", "'use strict';"]) {
        expect(run(prefix + text), { kind: "boolean", value: true }, text);
    }
}

const points = [
    0, 65, 0xd7ff, 0xd800, 0xdbff, 0xdc00, 0xdfff, 0xe000, 0xffff, 0x10000, 0x1f600, 0x10ffff,
];
const strings = [
    "\0",
    "A",
    "\ud7ff",
    "\ud800",
    "\udbff",
    "\udc00",
    "\udfff",
    "\ue000",
    "\uffff",
    "\ud800\udc00",
    "😀",
    "\udbff\udfff",
];
for (let i = 0; i < points.length; i++) {
    expect(
        run("String.fromCodePoint(" + points[i] + ");"),
        { kind: "string", value: strings[i] },
        "encode boundary",
    );
    const realm = fresh();
    realm.defineScriptGlobal("text", { value: { kind: "string", value: strings[i] } });
    expect(
        run("text.codePointAt(0);", realm),
        { kind: "number", value: points[i] },
        "decode boundary",
    );
    if (strings[i].length === 2) {
        expect(
            run("text.codePointAt(1);", realm),
            { kind: "number", value: strings[i].charCodeAt(1) },
            "low surrogate index",
        );
    }
}

for (const text of ["\ud800x", "\ud800\udbff", "\udc00\ud800", "\udfff\udc00"]) {
    const realm = fresh();
    realm.defineScriptGlobal("text", { value: { kind: "string", value: text } });
    expect(
        run("text.codePointAt(0);", realm),
        { kind: "number", value: text.charCodeAt(0) },
        "unpaired unit",
    );
}

passes("String.fromCharCode()===''&&String.fromCodePoint()==='';");
passes("String.fromCharCode(65,66,67)==='ABC'&&String.fromCodePoint(65,66,67)==='ABC';");
passes("String.fromCharCode(65537,-65535,1.9,-65535.9)==='\\x01\\x01\\x01\\x01';");
passes("String.fromCharCode(-1,65535,4294967295)==='\\uffff\\uffff\\uffff';");
passes("String.fromCharCode(NaN,Infinity,-Infinity,undefined,null,-0)==='\\0\\0\\0\\0\\0\\0';");
passes("String.fromCodePoint(-0,null,false,'65',true)==='\\0\\0\\0A\\x01';");
passes("String.fromCharCode(55357,56832)==='😀';");
passes("String.prototype.codePointAt.call(123,1)===50&&new String('abc').codePointAt(1)===98;");
passes(
    "'abc'.codePointAt()===97&&'abc'.codePointAt(NaN)===97&&'abc'.codePointAt(-0.9)===97&&'abc'.codePointAt('1.9')===98;",
);
for (const position of ["-1", "3", "Infinity", "-Infinity"]) {
    passes("'abc'.codePointAt(" + position + ")===undefined;");
}
passes("''.codePointAt(0)===undefined;");
passes(
    "var trace='';var receiver={toString(){trace+='s';return 'abc';}};var index={valueOf(){trace+='i';return 1;}};String.prototype.codePointAt.call(receiver,index)===98&&trace==='si';",
);
passes(
    "var hit=false;var ok=false;try{String.prototype.codePointAt.call(null,{valueOf(){hit=true;return 0;}});}catch(e){ok=e instanceof TypeError;}ok&&!hit;",
);
passes("var hit=false;''.codePointAt({valueOf(){hit=true;return 0;}});hit;");
passes("var ok=false;try{'abc'.codePointAt({valueOf(){throw 7;}});}catch(e){ok=e===7;}ok;");
passes("'abc'.codePointAt(1,{valueOf(){throw 7;}})===98;");

for (const name of ["fromCharCode", "fromCodePoint"]) {
    passes(
        "var trace='';var a={valueOf(){trace+='a';return 65;}};var b={valueOf(){trace+='b';return {};},toString(){trace+='s';return '66';}};String." +
            name +
            "(a,b)==='AB'&&trace==='abs';",
    );
    passes(
        "var x={};x[Symbol.toPrimitive]=function(hint){if(hint!=='number')throw 9;return 65;};String." +
            name +
            "(x)==='A';",
    );
    passes(
        "var trace='';var a={valueOf(){trace+='a';throw 7;}};var b={valueOf(){trace+='b';return 66;}};var ok=false;try{String." +
            name +
            "(a,b);}catch(e){ok=e===7;}ok&&trace==='a';",
    );
    passes("String." + name + ".call(null,65)==='A';");
    passes(
        "var ok=false;try{String." + name + "(Symbol());}catch(e){ok=e instanceof TypeError;}ok;",
    );
}
for (const invalid of ["-1", "1114112", "1.1", "NaN", "Infinity", "-Infinity", "undefined"]) {
    passes(
        "var hit=false;var ok=false;try{String.fromCodePoint(" +
            invalid +
            ",{valueOf(){hit=true;return 65;}});}catch(e){ok=e instanceof RangeError;}ok&&!hit;",
    );
}
for (const receiver of ["null", "undefined", "Symbol()"]) {
    passes(
        "var ok=false;try{String.prototype.codePointAt.call(" +
            receiver +
            ",0);}catch(e){ok=e instanceof TypeError;}ok;",
    );
}
passes("var ok=false;try{'abc'.codePointAt(Symbol());}catch(e){ok=e instanceof TypeError;}ok;");

for (const name of ["fromCharCode", "fromCodePoint", "codePointAt"]) {
    const holder = name === "codePointAt" ? "String.prototype" : "String";
    passes(
        "var f=" +
            holder +
            "." +
            name +
            ";f.name==='" +
            name +
            "'&&f.length===1&&!f.hasOwnProperty('prototype');",
    );
    passes(
        "var d=Object.getOwnPropertyDescriptor(" +
            holder +
            ",'" +
            name +
            "');d.writable&&!d.enumerable&&d.configurable;",
    );
    passes(
        "var ok=false;try{new " +
            holder +
            "." +
            name +
            "();}catch(e){ok=e instanceof TypeError;}ok;",
    );
    const owner = fresh(),
        caller = fresh();
    const method = run(holder + "." + name + ";", owner);
    check(method.type === "normal", "method exists");
    if (method.type === "normal") {
        caller.defineScriptGlobal("f", { value: method.value });
    }
    const expression = name === "codePointAt" ? "f.call(null);" : "f(Symbol());";
    const result = run(expression, caller);
    check(
        result.type === "throw" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
        "defining Realm TypeError",
    );
    if (name === "fromCodePoint") {
        const range = run("f(-1);", caller);
        check(
            range.type === "throw" &&
                range.value.kind === "object" &&
                range.value.object.getPrototypeOf() === owner.getErrorPrototype("RangeError"),
            "defining Realm RangeError",
        );
    }
}

for (const name of ["fromCharCode", "fromCodePoint"]) {
    const args: string[] = [];
    for (let i = 0; i < 100; i++) {
        args.push("65");
    }
    const result = run("String." + name + "(" + args.join(",") + ");", fresh(), 150);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded construction",
    );
}
const legacy = new Realm((_line: string) => {});
check(
    legacy.stringPrototype.getOwnProperty("codePointAt") === undefined,
    "legacy prototype unchanged",
);
console.log("String code points passed");
