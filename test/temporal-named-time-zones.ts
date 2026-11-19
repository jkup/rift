import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
const realm = new Realm((_line: string) => {}, "script");
const rows = readFileSync("test/fixtures/temporal-named-time-zones.txt", "utf8").trim().split("\n");
if (rows.length !== 1170) {
    throw new Error("named admission denominator");
}
for (let index = 0; index < rows.length; index++) {
    const prepared = prepareBoundedScript({ id: "named-zone-" + index, text: rows[index] }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare named zone " + index);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("named zone " + index + ": " + rows[index]);
    }
}
console.log("temporal named time zones passed");
