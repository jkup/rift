import { auditPrivateClassSyntax } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const valid = [
    "class A { #x; read(o){ return o.#x; } }",
    "class A { read(o){ return o.#x; } #x; }",
    "class A { #x = this.#y; #y = 1; }",
    "class A { #m(){} *#g(){ yield 1; } async #a(){ await 1; } }",
    "class A { get #x(){return 1;} set #x(v){} }",
    "class A { static set #x(v){} static get #x(){return 1;} }",
    "class A { #x; static read(o){return o.#x;} }",
    "class A { static #x; read(o){return o.#x;} }",
    "class A { #x; read(o){return o?.#x;} }",
    "class A { #x; read(o){ o.#x++; ++o.#x; o.#x += 2; o.#x ||= 3; } }",
    "class A { #x; read(o){ return new o.#x(); } }",
    "class A { #x; read(o){ return o.#x(); } }",
    "class A { #x; read(o){ return #x in o; } }",
    "class A { #x; read(o){ return !(#x in o) && #x in o; } }",
    "class A { #x; read(o){ return #x in o === true; } }",
    "class A { #x; *read(o){ return #x in (yield o); } }",
    "class A { #x; async read(o){ return #x in await o; } }",
    "class A { #x; read(o){ return ()=>o.#x; } }",
    "class A { read(){ return class B { m(o){return o.#x;} }; } #x; }",
    "class A { #x; read(){ return class B { #x; m(o){return o.#x;} }; } }",
    "class A { #x; read(o){ return class B extends o.#x { #x; }; } }",
    "class A { read(o){ return class B extends o.#x { #x; }; } #x; }",
    "class A { #x; static { this.#x; } }",
    "class A { #x; read(o){ ({a:o.#x} = o); [o.#x] = o; } }",
    "class A { #x; read(o){ delete o.#x.public; delete o?.#x.public; } }",
    "class A { #π; #𐐀; read(o){return o.#π + o.#𐐀;} }",
    "class A { #\\u0078; read(o){return o.#x;} }",
    "class A { #x; read(o){return o.#\\u0078;} }",
    "class A { #if; #static; #constructorName; }",
    "class A { #x; } class B { #x; }",
];
const laterPrivateFeatures = [valid[12], valid[13], valid[14], valid[15], valid[16]];
for (const text of valid) {
    const result = auditPrivateClassSyntax(text);
    check(result.kind === "valid", "valid private syntax: " + text + " -> " + JSON.stringify(result));
    check((prepareBoundedScript({ id: "private-syntax", text }, new Realm((_line: string) => {}, "script")).kind === "ready") === !laterPrivateFeatures.includes(text), "private fields/methods/accessors admitted; brand checks remain unsupported: " + text);
}
const invalid = [
    "class A { #x; #x; }", "class A { #x; static #x; }",
    "class A { #x; #x(){} }", "class A { get #x(){} get #x(){} }",
    "class A { set #x(v){} set #x(v){} }",
    "class A { get #x(){} static set #x(v){} }",
    "class A { get #x(){} set #x(v){} get #x(){} }",
    "class A { #constructor; }", "class A { static #constructor(){} }",
    "class A { #x; #\\u0078; }",
    "class A { read(o){return o.#x;} }", "o.#x;", "#x in o;",
    "class A { #x; } class B { m(o){return o.#x;} }",
    "class A extends o.#x { #x; }",
    "class A { read(o){return class B extends o.#x { #x; };} }",
    "class A { #x; read(o){delete o.#x;} }",
    "class A { #x; read(o){delete (o.#x);} }",
    "class A { #x; read(o){delete o?.#x;} }",
];
for (const text of invalid) check(auditPrivateClassSyntax(text).kind === "invalid", "invalid private syntax: " + text);
const blocked = [
    "class A { get\n#x; }", "class A { set\n#x; }",
    "class A { static get\n#x; }", "class A { get\nx; }",
    "class A { set\nx; }", "class A { get\n[\"x\"]; }",
    "class A { #x; read(o){ return 1 + #x in o; } }",
    "class A { #x; read(o){ return !#x in o; } }",
    "class A { #x; read(o){ return #x; } }",
    "class A { #x; read(o){ return #x in #x in o; } }",
    "class A { #x; read(){return super.#x;} }",
    "class A { #x; #x; } @", "class A { #x; #x; } let =;",
    "class A { #x; read(o){ return #x in o; }", "({#x:1});",
];
for (const text of blocked) check(auditPrivateClassSyntax(text).kind === "blocked", "grammar remains blocked: " + text);
const duplicate = auditPrivateClassSyntax("class A { #x;\n #x; }");
check(duplicate.kind === "invalid" && duplicate.issue.site.loc.line === 2 && duplicate.issue.site.loc.column === 2, "duplicate source location");
check(auditPrivateClassSyntax(" ".repeat(100001)).kind === "blocked", "source budget");
check(auditPrivateClassSyntax("class A { #x; m(o){return " + "(".repeat(140) + "o.#x" + ")".repeat(140) + ";} }").kind === "blocked", "nesting budget");
console.log("private class syntax passed");
