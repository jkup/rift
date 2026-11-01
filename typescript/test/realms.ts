// This host driver is compiled, but the guest sources are always read at runtime.
import { readFileSync } from "node:fs";
import { run } from "../src/interpreter.js";
import { Realm } from "../src/realm.js";
import { GuestObject, normal, UNDEFINED } from "../src/runtime.js";
const a = new Realm((line) => { console.log("a " + line); });
const b = new Realm((line) => { console.log("b " + line); });
const setup = readFileSync(process.argv[2], "utf8");
const check = readFileSync(process.argv[3], "utf8");
const first = run(setup, a);
const second = run(check, b);
const third = run("console.log(saved());", a);
if (first.phase !== "runtime" || first.completion.type !== "normal"
    || second.phase !== "runtime" || second.completion.type !== "normal"
    || third.phase !== "runtime" || third.completion.type !== "normal") throw new Error("realm test failed");
const av = a.global.bindings.get("console");
const bv = b.global.bindings.get("console");
if (av === undefined || bv === undefined || av.value.kind !== "object" || bv.value.kind !== "object") throw new Error("missing console");
if (av.value.object === bv.value.object) throw new Error("shared console");
const al = av.value.object.get("log"); const bl = bv.value.object.get("log");
if (al.kind !== "object" || bl.kind !== "object" || al.object === bl.object) throw new Error("shared builtin");
const target = new GuestObject();
target.define("fixed", { kind: "number", value: 1 }, false, false, false);
const write = target.set("fixed", UNDEFINED, { line: 1, column: 1 });
if (write.type !== "throw" || target.get("fixed").kind !== "number") throw new Error("descriptor write check failed");
const d = target.properties.get("fixed");
if (d === undefined || d.writable || d.enumerable || d.configurable) throw new Error("descriptor flags failed");
a.registerBuiltin(target, "test", (receiver, args, _loc) => {
    if (receiver.kind !== "object" || receiver.object !== target || args.length !== 1) throw new Error("builtin call boundary failed");
    return normal(args[0]);
});
a.global.bindings.set("host", { initialized: true, mutable: true, value: { kind: "object", object: target } });
const builtin = run("console.log(host.test(23));", a);
if (builtin.phase !== "runtime" || builtin.completion.type !== "normal") throw new Error("builtin result failed");
// Host callback failures must escape run(), never become catchable guest throws.
const broken = new Realm((_line) => { throw new Error("host output fault"); });
let escaped = false;
try { run("console.log(1);", broken); }
catch (error) { escaped = error instanceof Error && error.message === "host output fault"; }
if (!escaped) throw new Error("host fault was swallowed");
console.log("realms independent");
