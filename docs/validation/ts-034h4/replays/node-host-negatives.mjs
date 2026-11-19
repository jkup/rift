import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { Realm } from "../../../../build/node/src/realm.js";
import { prepareStrictScript } from "../../../../build/node/src/script-record.js";
import { normal, UNDEFINED } from "../../../../build/node/src/runtime.js";
const realm = new Realm(() => {}, "script"), legacy = new Realm(() => {});
const prepared = prepareStrictScript({ id: "negative", text: '"use strict";function f(a){return a;}' }, realm);
assert.equal(prepared.kind, "ready");
const record = prepared.record, global = { kind: "global", record: realm.globalEnvironment };
let ticks = 0;
const context = { realm, tick: () => { ticks++; return normal(); }, call: () => { throw new Error("no call"); } };
const fake = { kind: "script-guest", realm, record, scopeId: 1, environment: global, strict: true,
    thisMode: "strict", privateEnvironment: null, sourceText: () => "function f(a){return a;}", inspectFormals: () => ["a"] };
const cases = [
    ["F07 legacy Environment as ScriptEnvironment", () => record.materializeFunction(1, legacy.global, null, context), "invalid Script environment tag", "foreign-union.ts", "SC2003"],
    ["F09 structural fake as ScriptGuestCallable", () => record.createFunctionEnvironment(fake, UNDEFINED, context), "invalid Script callable brand", "forged-record.ts", "SC2002"],
];
const results = [];
for (const [id, action, message, nativeReduction, code] of cases) {
    const properties = [...realm.globalObject.properties];
    assert.throws(action, { message });
    assert.equal(ticks, 0); assert.equal(record.inspectMaterializations().completed, 0);
    assert.deepEqual([...realm.globalObject.properties], properties);
    results.push({ id, nodeRuntime: "PASS", ticks: 0, materializations: 0, nativeRuntime: "not representable; not claimed", nativeReduction, code });
}
writeFileSync(new URL("node-host-negative-results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log("Node-only hostile host negatives: 2 PASS; native compile-rejection controls are separate.");
