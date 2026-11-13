import { readFileSync } from "node:fs";
import { prepareBoundedScript } from "./script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "./script-execution.js";
import { Realm } from "./realm.js";
import { parseTemporalTimeZoneIdentifier } from "./temporal-time-zone-parse.js";
import { display } from "./runtime.js";
import type { Diagnostic } from "./syntax.js";
function report(filename: string, diagnostic: Diagnostic): void {
    console.error(filename + ":" + diagnostic.loc.line + ":" + diagnostic.loc.column + ": " + diagnostic.phase + " " + diagnostic.name + ": " + diagnostic.message);
}
function main(): void {
    let args = process.argv.slice(2);
    let timeZone = "UTC";
    if (args[0] === "--time-zone") {
        timeZone = args[1];
        args = args.slice(2);
    }
    if (!((args.length === 1 && args[0] !== "-e") || (args.length === 2 && args[0] === "-e"))) {
        console.error("usage: rift [--time-zone <identifier>] <file.js> | -e <source>"); process.exitCode = 64; return;
    }
    if (parseTemporalTimeZoneIdentifier(timeZone) === null) {
        console.error("invalid time zone: " + timeZone); process.exitCode = 64; return;
    }
    let source = "";
    const filename = args[0] === "-e" ? "<eval>" : args[0];
    if (args[0] === "-e") source = args[1];
    else {
        try { source = readFileSync(filename, "utf8"); }
        catch { console.error("cannot read source: " + filename); process.exitCode = 66; return; }
    }
    const realm = new Realm((line) => { console.log(line); }, "script", timeZone);
    const prepared = prepareBoundedScript({ id: filename, text: source }, realm);
    if (prepared.kind === "profile-rejected") throw new Error("CLI Script profile rejected");
    if (prepared.kind !== "ready") {
        report(filename, prepared.diagnostic);
        process.exitCode = 2;
        return;
    }
    const session = createScriptSession();
    const result = evaluateScript(session, prepared.record);
    if (result.completion.type === "throw") {
        const d = result.completion.diagnostic;
        if (d.name === "Uncaught") d.message = display(result.completion.value);
        report(filename, d); process.exitCode = 1;
    } else if (result.completion.type !== "normal") throw new Error("top-level abrupt control flow");
    for (const failure of drainScriptJobs(session).failures) {
        const diagnostic = failure.completion.diagnostic;
        if (diagnostic.name === "Uncaught") diagnostic.message = display(failure.completion.value);
        report(failure.source.unitId, diagnostic);
        process.exitCode = 1;
    }
}
try { main(); }
catch (error) {
    console.error("internal fault: " + (error instanceof Error ? error.message : "unknown host exception"));
    process.exitCode = 70;
}
