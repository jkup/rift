import { Realm } from "../src/realm.js";
import { normal, sameValue, languageFailure, type Value, type ValueCompletion, type GuestObject } from "../src/runtime.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function str(value: string): Value { return { kind: "string", value }; }
function num(value: number): Value { return { kind: "number", value }; }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function define(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name, { value, configurable: true }); }
function fixture(value: Value) {
    const realm = new Realm((_line: string) => {}, "script");
    define(realm, "target", value);
    return realm;
}
function run(realm: Realm, method: string, args = "", steps = 100000): ValueCompletion {
    const text = "''." + method + ".call(target" + (args === "" ? "" : "," + args) + ");";
    const prepared = prepareBoundedScript({ id: "string-methods", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function result(actual: ValueCompletion, expected: Value): void {
    check(actual.type === "normal" && sameValue(actual.value, expected), "result");
}
{
    const realm = fixture(str("A😀\ud800Z\udfff"));
    const units = ["A", "\ud83d", "\ude00", "\ud800", "Z", "\udfff"];
    const codes = [65, 55357, 56832, 55296, 90, 57343];
    for (let i = 0; i < units.length; i++) {
        result(run(realm, "charAt", String(i)), str(units[i]));
        result(run(realm, "charCodeAt", String(i)), num(codes[i]));
    }
    for (const position of ["-1", "6", "Infinity", "-Infinity"]) {
        result(run(realm, "charAt", position), str(""));
        result(run(realm, "charCodeAt", position), num(NaN));
    }
    result(run(realm, "slice", "1,3"), str("😀"));
    result(run(realm, "slice", "1,2"), str("\ud83d"));
    result(run(realm, "slice", "2,3"), str("\ude00"));
    result(run(realm, "slice", "-2"), str("Z\udfff"));
    result(run(realm, "slice", "4,1"), str(""));
}
for (const method of ["charAt", "charCodeAt", "slice"]) {
    const realm = new Realm((_line: string) => {}, "script");
    const target = realm.createObject(), start = realm.createObject(), end = realm.createObject();
    let trace = "";
    const receiverHook = realm.createBuiltin("receiver", 0, (_receiver, _args, _context, _loc) => {
        trace += "R";
        return normal(str("abcd"));
    });
    const startHook = realm.createBuiltin("start", 0, (_receiver, _args, _context, _loc) => {
        trace += "S";
        return normal(num(1));
    });
    const endHook = realm.createBuiltin("end", 0, (_receiver, _args, _context, _loc) => {
        trace += "E";
        return normal(num(3));
    });
    target.bootstrapDefine("toString", { value: obj(receiverHook), configurable: true });
    start.bootstrapDefine("valueOf", { value: obj(startHook), configurable: true });
    end.bootstrapDefine("valueOf", { value: obj(endHook), configurable: true });
    define(realm, "target", obj(target)); define(realm, "start", obj(start)); define(realm, "end", obj(end));
    result(run(realm, method, "start,end"), method === "charCodeAt" ? num(98) : str(method === "slice" ? "bc" : "b"));
    check(trace === (method === "slice" ? "RSE" : "RS"), "receiver and argument coercion order");
    trace = "";
    const fail = realm.createBuiltin("fail", 0, (_receiver, _args, context, loc) => {
        trace += "F";
        return languageFailure(context.realm, "TypeError", "conversion sentinel", loc);
    });
    start.bootstrapDefine("valueOf", { value: obj(fail), configurable: true });
    const badStart = run(realm, method, "start,end");
    check(badStart.type === "throw" && badStart.diagnostic.message === "conversion sentinel" && trace === "RF", "start failure skips end");
    if (method === "slice") {
        trace = "";
        start.bootstrapDefine("valueOf", { value: obj(startHook), configurable: true });
        end.bootstrapDefine("valueOf", { value: obj(fail), configurable: true });
        const badEnd = run(realm, method, "start,end");
        check(badEnd.type === "throw" && badEnd.diagnostic.message === "conversion sentinel" && trace === "RSF", "end failure follows start");
    }
    trace = "";
    target.bootstrapDefine("toString", { value: obj(fail), configurable: true });
    const badReceiver = run(realm, method, "start,end");
    check(badReceiver.type === "throw" && badReceiver.diagnostic.message === "conversion sentinel" && trace === "F", "receiver failure skips arguments");
}
for (const method of ["charAt", "charCodeAt", "slice"]) {
    const rejected: Value[] = [{kind: "null"}, {kind: "undefined"}, {kind: "symbol", value: wellKnownToPrimitive}];
    for (const receiver of rejected) {
        const realm = fixture(receiver);
        const position = realm.createObject();
        const hook = realm.createBuiltin("unused", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
            throw new Error("position converted after receiver rejection");
        });
        position.bootstrapDefine("valueOf", { value: obj(hook) }); define(realm, "position", obj(position));
        const actual = run(realm, method, "position");
        check(actual.type === "throw" && actual.diagnostic.name === "TypeError", "invalid receiver");
    }
    const realm = fixture(str("abc"));
    define(realm, "symbol", {kind: "symbol", value: wellKnownToPrimitive});
    const actual = run(realm, method, "symbol");
    check(actual.type === "throw" && actual.diagnostic.name === "TypeError", "symbol position");
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const boxed = realm.createStringObject("original");
    const hook = realm.createBuiltin("overridden", 0, (_receiver, _args, _context, _loc) => normal(str("changed")));
    boxed.bootstrapDefine("toString", { value: obj(hook) }); define(realm, "target", obj(boxed));
    result(run(realm, "charAt", "0"), str("c"));
    result(run(realm, "slice", "0,3"), str("cha"));
}
{
    let interrupted = false;
    for (let steps = 1; steps < 80; steps++) {
        const realm = new Realm((_line: string) => {}, "script");
        const target = realm.createObject(), position = realm.createObject();
        let trace = "";
        const receiverHook = realm.createBuiltin("receiver", 0, (_receiver, _args, _context, _loc) => {
            trace += "R"; return normal(str("abc"));
        });
        const positionHook = realm.createBuiltin("position", 0, (_receiver, _args, _context, _loc) => {
            trace += "P"; return normal(num(0));
        });
        target.bootstrapDefine("toString", { value: obj(receiverHook) });
        position.bootstrapDefine("valueOf", { value: obj(positionHook) });
        define(realm, "target", obj(target)); define(realm, "position", obj(position));
        const actual = run(realm, "charAt", "position", steps);
        if (actual.type === "throw" && trace === "R") {
            check(actual.origin.kind === "resource-limit", "conversion budget classification");
            interrupted = true; break;
        }
    }
    check(interrupted, "budget interrupts coercion without later effects");
}
{
    const realm = fixture(str("A😀\ud800Z\udfff"));
    const needles = ["A", "😀", "\ud83d", "\ude00", "\ud800", "Z", "\udfff", "", "missing"];
    const expected = [0, 1, 1, 2, 3, 4, 5, 0, -1];
    for (let i = 0; i < needles.length; i++) {
        define(realm, "needle", str(needles[i]));
        result(run(realm, "indexOf", "needle"), num(expected[i]));
    }
    define(realm, "needle", str("\ude00"));
    result(run(realm, "indexOf", "needle,2"), num(2));
    result(run(realm, "indexOf", "needle,3"), num(-1));
    result(run(realm, "indexOf", "'',Infinity"), num(6));
}
for (const method of ["indexOf", "lastIndexOf"]) {
    for (const failure of ["", "R", "S", "P"]) {
        const realm = new Realm((_line: string) => {}, "script");
        const target = realm.createObject(), search = realm.createObject(), position = realm.createObject();
        let trace = "";
        for (const label of ["R", "S", "P"]) {
            const hook = realm.createBuiltin(label, 1, (_receiver, args, context, loc): ValueCompletion => {
                check(args[0].kind === "string" && args[0].value === (label === "P" ? "number" : "string"), "search coercion hints");
                trace += label;
                if (failure === label) return languageFailure(context.realm, "TypeError", "search " + label, loc);
                return normal(label === "P" ? num(1) : str(label === "R" ? "abca" : "a"));
            });
            (label === "R" ? target : label === "S" ? search : position).bootstrapDefine(wellKnownToPrimitive, {value: obj(hook)});
        }
        define(realm, "target", obj(target)); define(realm, "search", obj(search)); define(realm, "position", obj(position));
        const actual = run(realm, method, "search,position");
        if (failure === "") { result(actual, num(method === "indexOf" ? 3 : 0)); check(trace === "RSP", "search conversion order"); }
        else {
            check(actual.type === "throw" && actual.diagnostic.message === "search " + failure, "search conversion failure");
            check(trace === (failure === "R" ? "R" : failure === "S" ? "RS" : "RSP"), "search stops at failed coercion");
        }
    }
}
{
    const realm = fixture({kind: "null"});
    const actual = run(realm, "indexOf", "'x'");
    check(actual.type === "throw" && actual.diagnostic.name === "TypeError", "null search receiver");
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 25; steps++) {
        const r = fixture(str("abca")), actual = run(r, "indexOf", "'a',1", steps);
        if (actual.type === "throw") { check(actual.origin.kind === "resource-limit", "search budget"); interrupted = true; }
        else { result(actual, num(3)); completed = true; }
    }
    check(interrupted && completed, "search budget boundary");
}


{
    const realm = fixture(str("A😀A\ud800"));
    define(realm,"needle",str("\ud83d")); result(run(realm,"lastIndexOf","needle"),num(1));
    define(realm,"needle",str("\ude00")); result(run(realm,"lastIndexOf","needle"),num(2));
    define(realm,"needle",str("\ud800")); result(run(realm,"lastIndexOf","needle"),num(4));
    for (const position of ["undefined","NaN","Infinity","99","'bad'"]) result(run(realm,"lastIndexOf","'A',"+position),num(3));
    for (const position of ["null","-Infinity","-1","1.9"]) result(run(realm,"lastIndexOf","'A',"+position),num(0));
    result(run(realm,"lastIndexOf","''"),num(5));
    result(run(realm,"lastIndexOf","'',-Infinity"),num(0));
    result(run(realm,"lastIndexOf","'longer than input'"),num(-1));
    result(run(fixture(str("undefined undefined")),"lastIndexOf"),num(10));
    result(run(fixture(str("aaaa")),"lastIndexOf","'aa',2"),num(2));
    result(run(fixture(str("")),"lastIndexOf","''"),num(0));
}
for (const method of ["concat", "lastIndexOf"]) {
    const realm = fixture({kind:"null"});
    const rejected = run(realm,method,"'x'");
    check(rejected.type === "throw" && rejected.diagnostic.name === "TypeError",method + " null receiver");
    const r = fixture(str("x"));define(r,"symbol",{kind:"symbol",value:wellKnownToPrimitive});
    const symbol = run(r,method,"symbol");
    check(symbol.type === "throw" && symbol.diagnostic.name === "TypeError",method + " symbol argument");
}
{
    const realm = fixture(str("A\ud83d"));define(realm,"tail",str("\ude00\ud800"));
    result(run(realm,"concat","tail,null,undefined,7,true"),str("A😀\ud800nullundefined7true"));
    result(run(fixture(num(12)),"concat","3"),str("123"));
    result(run(fixture(str("x")),"concat"),str("x"));
}
for (const failure of ["", "R", "A", "B"]) {
    const realm = fixture(str("")), target = realm.createObject(), a = realm.createObject(), b = realm.createObject();
    let trace = "";
    for (const label of ["R", "A", "B"]) {
        const hook = realm.createBuiltin(label,1,(_receiver,args,context,loc): ValueCompletion => {
            check(args[0].kind === "string" && args[0].value === "string","concat string hint");
            trace += label;
            if (label === failure) return languageFailure(context.realm,"TypeError","concat "+label,loc);
            return normal(str(label));
        });
        (label === "R" ? target : label === "A" ? a : b).bootstrapDefine(wellKnownToPrimitive,{value:obj(hook)});
    }
    define(realm,"target",obj(target));define(realm,"a",obj(a));define(realm,"b",obj(b));
    const actual = run(realm,"concat","a,b");
    if (failure === "") { result(actual,str("RAB"));check(trace === "RAB","concat order"); }
    else check(actual.type === "throw" && actual.diagnostic.message === "concat "+failure && trace === (failure === "R" ? "R" : failure === "A" ? "RA" : "RAB"),"concat stops on failed conversion");
}
{
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 40; steps++) {
        const actual = run(fixture(str("x")),"concat","1,2,3,4,5",steps);
        if (actual.type === "throw") {check(actual.origin.kind === "resource-limit","concat step classification");interrupted = true;}
        else {result(actual,str("x12345"));completed = true;}
    }
    check(interrupted && completed,"concat bounded argument loop");
}
console.log("string methods passed");
