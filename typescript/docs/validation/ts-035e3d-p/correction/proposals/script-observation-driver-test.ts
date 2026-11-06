import { readFileSync, writeFileSync } from "node:fs";
import { observeScriptControl, validateConformancePreflightArguments, produceConformancePreflightControl, type ObservationUnit } from "../src/script-observation.js";
import { scriptObservationJSONRecord } from "../src/script-observation-json.js";

function decimal(text: string): number {
    if (text.length === 0) throw new Error("empty limit");
    for (let n = 0; n < text.length; n++) if (text.charCodeAt(n) < 48 || text.charCodeAt(n) > 57) throw new Error("nondecimal limit");
    const value = Number(text);
    if (!Number.isSafeInteger(value)) throw new Error("unsafe limit");
    return value;
}
function identifier(text: string): void {
    if (text.length === 0) throw new Error("empty identifier");
    for (let n = 0; n < text.length; n++) if (text.charCodeAt(n) < 33 || text.charCodeAt(n) > 126) throw new Error("invalid identifier");
}
function main(): void {
    if (process.argv[2] === "conformance-preflight-v1") {
        const args = process.argv.slice(2);
        validateConformancePreflightArguments(args);
        const texts: string[] = [];
        for (let n = 17; n < args.length; n += 3) texts.push(readFileSync(args[n + 2], "utf8"));
        const result = produceConformancePreflightControl(args, texts);
        writeFileSync(args[9], scriptObservationJSONRecord(result.child), { encoding: "utf8", flag: "wx" });
        writeFileSync(args[9] + ".control.json", JSON.stringify(result.report), { encoding: "utf8", flag: "wx" });
        return;
    }

    const control = process.argv[2];
    const input = readFileSync(process.argv[3], "utf8").trim();
    const args = process.argv.slice(4);
    if (args.length < 11 || (args.length - 8) % 3 !== 0) throw new Error("invalid Script argument count");
    if (args[0] !== "script-observation") throw new Error("invalid Script mode");
    const action = args[1];
    if (action !== "execute" && action !== "parse-only") throw new Error("invalid Script action");
    identifier(args[2]); identifier(args[4]);
    if (args[3].length !== 64) throw new Error("invalid request hash");
    for (let n = 0; n < args[3].length; n++) {
        const c = args[3].charCodeAt(n);
        if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) throw new Error("invalid request hash");
    }
    const steps = decimal(args[6]), calls = decimal(args[7]);
    // Validate every triple before reading any source. The parent separately
    // authenticates bytes/hash/metadata; argv never supplies executable ASTs.
    for (let n = 8; n < args.length; n += 3) {
        if (args[n] !== "u" + ((n - 8) / 3) || args[n + 1] !== (n === args.length - 3 ? "test" : "harness") || args[n + 2].length === 0)
            throw new Error("invalid Script unit");
    }
    const units: ObservationUnit[] = [];
    for (let n = 8; n < args.length; n += 3) units.push({ id: args[n], role: n === args.length - 3 ? "test" : "harness", text: readFileSync(args[n + 2], "utf8") });
    const result = observeScriptControl({ nonce: args[2], requestSha256: args[3], action, preflightId: args[4] === "-" ? null : args[4], steps, calls, units }, control, input);
    writeFileSync(args[5], scriptObservationJSONRecord(result.child), "utf8");
    writeFileSync(args[5] + ".control.json", JSON.stringify(result.report), "utf8");
}
try { main(); }
catch { console.error("Script observation driver fault"); process.exitCode = 70; }
