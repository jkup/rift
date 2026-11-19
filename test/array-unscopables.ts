import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { wellKnownUnscopables } from "../src/symbols.js";
import type { GuestObject } from "../src/runtime.js";

const cases: { id: string; text: string; expected: string }[] = [
  {
    "id": "descriptors",
    "text": "var p=Array.prototype,s=Symbol.unscopables,d=Object.getOwnPropertyDescriptor(p,s);if(d===undefined){console.log(JSON.stringify(\"missing\"));}else{var u=d.value;console.log(JSON.stringify({flags:[d.writable,d.enumerable,d.configurable],nullPrototype:Object.getPrototypeOf(u)===null,keys:Reflect.ownKeys(u),properties:Object.keys(u).map(function(k){var p=Object.getOwnPropertyDescriptor(u,k);return [p.value,p.writable,p.enumerable,p.configurable]})}));}\n",
    "expected": "{\"flags\":[false,false,true],\"nullPrototype\":true,\"keys\":[\"at\",\"copyWithin\",\"entries\",\"fill\",\"find\",\"findIndex\",\"findLast\",\"findLastIndex\",\"flat\",\"flatMap\",\"includes\",\"keys\",\"toReversed\",\"toSorted\",\"toSpliced\",\"values\"],\"properties\":[[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true]]}\n"
  },
  {
    "id": "inheritance",
    "text": "var p=Array.prototype,s=Symbol.unscopables,d=Object.getOwnPropertyDescriptor(p,s);if(d===undefined){console.log(JSON.stringify(\"missing\"));}else{class Sub extends Array{};console.log(JSON.stringify([[][s]===d.value,new Sub()[s]===d.value,Object.getOwnPropertyDescriptor([],s)===undefined,Object.getOwnPropertyDescriptor(Array,s)===undefined]));}\n",
    "expected": "[true,true,true,true]\n"
  },
  {
    "id": "mutable-object",
    "text": "var p=Array.prototype,s=Symbol.unscopables,d=Object.getOwnPropertyDescriptor(p,s);if(d===undefined){console.log(JSON.stringify(\"missing\"));}else{var u=d.value;u.find=false;u.extra=7;var removed=delete u.keys;console.log(JSON.stringify([u.find,u.extra,removed,u.keys===undefined,Object.isExtensible(u),p[s]===u]));}\n",
    "expected": "[false,7,true,true,true,true]\n"
  },
  {
    "id": "parent-property",
    "text": "var p=Array.prototype,s=Symbol.unscopables,d=Object.getOwnPropertyDescriptor(p,s);if(d===undefined){console.log(JSON.stringify(\"missing\"));}else{var u=d.value;p[s]=0;var same=p[s]===u;var threw=false;try{(function(){\"use strict\";p[s]=0;})();}catch(e){threw=e instanceof TypeError;}var removed=delete p[s];console.log(JSON.stringify([same,threw,removed,Object.getOwnPropertyDescriptor(p,s)===undefined]));}\n",
    "expected": "[true,true,true,true]\n"
  }
];
function execute(realm: Realm, id: string, text: string): void {
    const prepared = prepareBoundedScript({ id, text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + id);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("execute " + id);
}
for (const item of cases) {
    let output = "";
    const realm = new Realm((line: string) => { output += line + "\n"; }, "script");
    execute(realm, item.id, item.text);
    if (output !== item.expected) throw new Error("output " + item.id + ": " + output);
}
function unscopables(realm: Realm): GuestObject {
    const descriptor = realm.arrayPrototype.getOwnProperty(wellKnownUnscopables);
    if (descriptor === undefined || descriptor.kind !== "data" || descriptor.value.kind !== "object")
        throw new Error("missing unscopables object");
    return descriptor.value.object;
}
let output = "";
const first = new Realm((line: string) => { output += line + "\n"; }, "script");
const second = new Realm((_line: string) => {}, "script");
if (unscopables(first) === unscopables(second)) throw new Error("shared Realm object");
first.defineScriptGlobal("foreign", { value: { kind: "object", object: unscopables(second) } });
execute(first, "realm-isolation", "Array.prototype[Symbol.unscopables].find=false; delete Array.prototype[Symbol.unscopables].keys; console.log(foreign.find, foreign.keys);");
if (output !== "true true\n") throw new Error("cross-Realm mutation");
const legacy = new Realm((_line: string) => {});
if (legacy.arrayPrototype.getOwnProperty(wellKnownUnscopables) !== undefined) throw new Error("legacy property changed");
const withStatement = prepareBoundedScript({ id: "with-boundary", text: "with([]){}" }, first);
if (withStatement.kind === "ready") throw new Error("unexpected with-statement admission");
console.log("array unscopables passed");
