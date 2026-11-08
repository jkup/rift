import { readFileSync } from "node:fs";
import { prepareBoundedScript } from "./script-record.js";
import { createScriptSession, evaluateScript } from "./script-execution.js";
import { Realm } from "./realm.js";
import { display } from "./runtime.js";
import type { Diagnostic } from "./syntax.js";
function report(filename: string, diagnostic: Diagnostic): void {
    console.error(filename + ":" + diagnostic.loc.line + ":" + diagnostic.loc.column + ": " + diagnostic.phase + " " + diagnostic.name + ": " + diagnostic.message);
}
function main(): void {
    const args = process.argv.slice(2);
    if (!((args.length === 1 && args[0] !== "-e") || (args.length === 2 && args[0] === "-e"))) {
        console.error("usage: rift <file.js> | -e <source>"); process.exitCode = 64; return;
    }
    let source = "";
    const filename = args[0] === "-e" ? "<eval>" : args[0];
    if (args[0] === "-e") source = args[1];
    else {
        try { source = readFileSync(filename, "utf8"); }
        catch { console.error("cannot read source: " + filename); process.exitCode = 66; return; }
    }
    const realm = new Realm((line) => { console.log(line); }, "script");
    const prepared = prepareBoundedScript({ id: filename, text: source }, realm);
    if (prepared.kind === "profile-rejected") throw new Error("CLI Script profile rejected");
    if (prepared.kind !== "ready") {
        report(filename, prepared.diagnostic);
        process.exitCode = 2;
        return;
    }
    const result = evaluateScript(createScriptSession(), prepared.record);
    if (result.completion.type === "throw") {
        const d = result.completion.diagnostic;
        if (d.name === "Uncaught") d.message = display(result.completion.value);
        report(filename, d); process.exitCode = 1;
    } else if (result.completion.type !== "normal") throw new Error("top-level abrupt control flow");
}
try { main(); }
catch (error) {
    console.error("internal fault: " + (error instanceof Error ? error.message : "unknown host exception"));
    process.exitCode = 70;
}
