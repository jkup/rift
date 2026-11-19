import { readFileSync, writeFileSync } from "node:fs";
import { Realm } from "./realm.js";
import { observe } from "./observation.js";
import { observationJSONRecord } from "./observation-json.js";

function decimalLimit(text: string): number {
    if (text.length === 0) throw new Error("empty limit");
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c < 48 || c > 57) throw new Error("nondecimal limit");
    }
    const value = Number(text);
    if (!Number.isSafeInteger(value)) throw new Error("unsafe limit");
    return value;
}
function main(): void {
    const args = process.argv.slice(2);
    if (args.length !== 7) throw new Error("observation driver requires seven arguments");
    const mode = args[0];
    if (mode !== "parser-observation" && mode !== "body-observation") throw new Error("invalid observation mode");
    const steps = decimalLimit(args[5]);
    const calls = decimalLimit(args[6]);
    if (args[4].length === 0) throw new Error("empty nonce");
    const source = readFileSync(args[1], "utf8");
    const realm = new Realm((line) => { console.log(line); });
    const result = observe(source, realm, mode, args[2], { steps, calls });
    writeFileSync(args[3], observationJSONRecord(result, args[4]), "utf8");
}
try { main(); }
catch {
    console.error("observation driver fault");
    process.exitCode = 70;
}
