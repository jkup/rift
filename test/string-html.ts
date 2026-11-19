import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
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
    const p = prepareBoundedScript({ id: "string-html", text }, realm);
    if (p.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, p.record).completion;
    check(session.inspect().active === null, "restored session");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        text,
    );
}
const methods = [
    ["anchor", "a", "name"],
    ["big", "big", ""],
    ["blink", "blink", ""],
    ["bold", "b", ""],
    ["fixed", "tt", ""],
    ["fontcolor", "font", "color"],
    ["fontsize", "font", "size"],
    ["italics", "i", ""],
    ["link", "a", "href"],
    ["small", "small", ""],
    ["strike", "strike", ""],
    ["sub", "sub", ""],
    ["sup", "sup", ""],
];
for (const prefix of ["", "'use strict';"]) {
    for (const row of methods) {
        const name = row[0],
            tag = row[1],
            attribute = row[2];
        const expected =
            "<" +
            tag +
            (attribute === "" ? "" : " " + attribute + '="a&quot;&<>\'"') +
            ">body<>&</" +
            tag +
            ">";
        passes(
            prefix +
                "'body<>&'." +
                name +
                "(" +
                JSON.stringify("a\"&<>'") +
                ")===" +
                JSON.stringify(expected) +
                ";",
        );
        passes(
            prefix +
                "var f=String.prototype." +
                name +
                ";f.name===" +
                JSON.stringify(name) +
                "&&f.length===" +
                (attribute === "" ? 0 : 1) +
                "&&!f.hasOwnProperty('prototype');",
        );
        passes(
            prefix +
                "var d=Object.getOwnPropertyDescriptor(String.prototype," +
                JSON.stringify(name) +
                ");d.writable&&!d.enumerable&&d.configurable;",
        );
        for (const receiver of ["null", "undefined", "Symbol()"]) {
            passes(
                prefix +
                    "var ok=false;try{String.prototype." +
                    name +
                    ".call(" +
                    receiver +
                    ");}catch(e){ok=e instanceof TypeError;}ok;",
            );
        }
        passes(
            prefix +
                "String.prototype." +
                name +
                ".call(7) === " +
                JSON.stringify(
                    "<" +
                        tag +
                        (attribute === "" ? "" : " " + attribute + '="undefined"') +
                        ">7</" +
                        tag +
                        ">",
                ) +
                ";",
        );
        const coercion =
            "var trace='';var body={toString(){trace+='B';return 'body';}};var arg={toString(){trace+='A';return 'attr';}};String.prototype." +
            name +
            ".call(body,arg);";
        passes(
            prefix + coercion + "trace===" + JSON.stringify(attribute === "" ? "B" : "BA") + ";",
        );
        passes(
            prefix +
                "var n=0;var body={toString(){throw 7;}};var arg={toString(){n++;return 'x';}};var ok=false;try{String.prototype." +
                name +
                ".call(body,arg);}catch(e){ok=e===7;}ok&&n===0;",
        );
        if (attribute !== "") {
            passes(
                prefix +
                    "var n=0;var arg={toString(){n++;throw 7;}};var ok=false;try{String.prototype." +
                    name +
                    ".call(null,arg);}catch(e){ok=e instanceof TypeError;}ok&&n===0;",
            );
            passes(
                prefix +
                    "var ok=false;try{'x'." +
                    name +
                    "(Symbol());}catch(e){ok=e instanceof TypeError;}ok;",
            );
            passes(
                prefix +
                    "'x'." +
                    name +
                    "(null)===" +
                    JSON.stringify("<" + tag + " " + attribute + '="null">x</' + tag + ">") +
                    ";",
            );
        } else {
            passes(
                prefix +
                    "'x'." +
                    name +
                    "({toString(){throw 7;}})===" +
                    JSON.stringify("<" + tag + ">x</" + tag + ">") +
                    ";",
            );
        }
    }
}
passes("'x'.anchor('')==='<a name=\"\">x</a>'&&''.bold()==='<b></b>';");
passes("'x'.link('\"\"')==='<a href=\"&quot;&quot;\">x</a>';");
const owner = fresh(),
    caller = fresh();
const method = run("String.prototype.anchor;", owner);
check(method.type === "normal", "foreign method");
if (method.type === "normal") {
    caller.defineScriptGlobal("foreign", { value: method.value });
}
const bad = run("foreign.call(null);", caller);
check(
    bad.type === "throw" &&
        bad.value.kind === "object" &&
        bad.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
    "captured Realm error",
);
const text = "\ud800\u0000😀\udfff";
caller.defineScriptGlobal("text", { value: { kind: "string", value: text } });
const result = run("foreign.call(text,text);", caller);
check(
    result.type === "normal" &&
        sameValue(result.value, {
            kind: "string",
            value: '<a name="' + text + '">' + text + "</a>",
        }),
    "UTF-16 preserved",
);
const bounded = fresh();
bounded.defineScriptGlobal("long", { value: { kind: "string", value: '"'.repeat(1000) } });
const limited = run("'x'.anchor(long);", bounded, 40);
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "bounded escaping");
const legacy = new Realm((_line: string) => {});
for (const row of methods) {
    check(legacy.stringPrototype.getOwnProperty(row[0]) === undefined, "legacy unchanged");
}
console.log("String HTML passed");
