import { replaceImportSources } from "../source-structure.mjs";
import { corpusRoot, scratchRoot } from "../environment.mjs";
import { createHash as sourceHash } from "node:crypto";
// Fault hooks exist only in isolated test copies.
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { readFileSync, writeFileSync, mkdirSync, cpSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
const own = scratchRoot,
    run = mkdtempSync(join(own, "faults-"));
const root = join(run, "isolated");
mkdirSync(root);
writeFileSync(
    join(run, "actual-source-identities.json"),
    JSON.stringify(
        ["tools/test262/script-plan.mjs", "tools/test262/script-ledger.mjs"].map((path) => ({
            path,
            sha256: createHashForSource(readFileSync(path)),
        })),
        null,
        2,
    ) + "\n",
);
function createHashForSource(bytes) {
    return sourceHash("sha256").update(bytes).digest("hex");
}

function copy(path) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(path, join(root, path), { recursive: true });
}
for (const path of [
    "tools/test262/script-plan.mjs",
    "tools/test262/script-ledger.mjs",
    "tools/test262/input.mjs",
    "tools/test262/script-capabilities.mjs",
    "tools/test262/script-capabilities.json",
    "fixtures/assistance/test262-starter-corpus/manifest.json",
    "package.json",
    "package-lock.json",
    "node_modules/yaml",
]) {
    copy(path);
}
const modules = join(root, "tools/test262");
writeFileSync(join(modules, "fault.mjs"), "export const c={trace:[],fail:null,after:false};\n");
const { c } = await import(pathToFileURL(join(modules, "fault.mjs")));
writeFileSync(
    join(modules, "io.mjs"),
    `
import * as fs from 'node:fs/promises';import {c} from './fault.mjs';
async function operation(name,fn) {
 c.trace.push(name);
 const fail=c.fail===name;
 if(fail && !c.after) {c.fail=null;throw Object.assign(Error('injected '+name),{code:c.errno??'EIO'});}
 const result=await fn();
 if(fail && c.after) {c.fail=null;throw Object.assign(Error('after '+name),{code:'EIO'});}
 return result;
}
export const mkdir=(...a)=>operation('mkdir',()=>fs.mkdir(...a));
export const lstat=(...a)=>operation('lstat',()=>fs.lstat(...a));
export const realpath=(...a)=>operation('realpath',()=>fs.realpath(...a));
export const link=(...a)=>operation('link',()=>fs.link(...a));
export const unlink=(...a)=>operation('unlink',()=>fs.unlink(...a));
export const readFile=(...a)=>operation('read',()=>fs.readFile(...a));
export async function open(...a){const h=await operation('open',()=>fs.open(...a));return {
 writeFile:async b=>operation('write',async()=>{if(c.partial){await h.writeFile(b.subarray(0,17));throw Error('partial write');}return h.writeFile(b);}),
 sync:()=>operation('sync',()=>h.sync()),close:()=>operation('close',()=>h.close())};}
`,
);
writeFileSync(
    join(modules, "context.mjs"),
    `
import {assertScriptSelectionCurrent as check,inspectScriptSelection} from './script-plan.mjs';
import {c} from './fault.mjs';export {inspectScriptSelection};
export async function assertScriptSelectionCurrent(t){c.trace.push('context');if(c.context)throw Error('context fault');return check(t);}
`,
);
let source = readFileSync(join(modules, "script-ledger.mjs"), "utf8");
source = replaceImportSources(source, {
    "node:fs/promises": "./io.mjs",
    "./script-plan.mjs": "./context.mjs",
});
source = "import {c} from './fault.mjs';\n" + source;
source = source.replace(
    "function acknowledge(state, pending) {",
    "function acknowledge(state, pending) {\n  if(c.ack){c.ack=false;storeFail('indeterminate');}",
);
// Private faults; deliberately not production exports.
source += `\nexport function privateControl(token, action) {
 const state=stores.get(token); if(action==='counter')state.anchor.generation=Number.MAX_SAFE_INTEGER;
 if(action==='history') {const v=structuredClone(ledgers.get(state.owner));v.attempts.push({});ledgers.set(state.owner,v);}
 if(action==='report')state.anchor.bytes=Buffer.from(state.anchor.bytes.toString().replace('"exitCode": 2','"exitCode": 1'));
}\n`;
writeFileSync(join(modules, "script-ledger.mjs"), source);
const plan = await import(pathToFileURL(join(modules, "script-plan.mjs"))),
    api = await import(pathToFileURL(join(modules, "script-ledger.mjs")));
const input = await import(pathToFileURL(join(modules, "input.mjs"))),
    { manifest } = await input.frozenManifest();
const options = {
    root: corpusRoot,
    revision: input.REVISION,
    lane: "node",
    paths: [manifest.entries[0].path],
};
const results = [];
let serial = 0;
function record(id, data = {}) {
    results.push({ id, ...data });
    writeFileSync(join(run, "results.json"), JSON.stringify(results, null, 2) + "\n");
}
function reset() {
    Object.assign(c, {
        trace: [],
        fail: null,
        after: false,
        partial: false,
        context: false,
        ack: false,
        errno: null,
    });
}
function error(prefix, code) {
    return (e) => {
        assert.equal(Object.getPrototypeOf(e), Error.prototype);
        assert.equal(e.message, prefix + "/" + code);
        assert.deepEqual(Object.keys(e), []);
        return true;
    };
}
const reject = (p, code) => assert.rejects(p, error("script-ledger-store", code));
async function fresh() {
    reset();
    const st = await plan.prepareScriptSelection(options),
        l = api.newScriptLedger(st),
        id = api.inspectScriptLedger(l).selection.files[0].slots[0].id,
        dir = join(run, "store-" + serial++),
        s = await api.createScriptLedgerStore(dir, l);
    return { l, id, dir, s };
}
for (const stage of ["open", "write", "sync", "close"]) {
    const { l, id, dir, s } = await fresh();
    api.appendScriptPolicy(l, id);
    const before = api.inspectScriptLedger(l);
    c.fail = stage;
    await reject(api.checkpointScriptLedger(s), "io");
    assert.deepEqual(api.inspectScriptLedger(l), before);
    assert(!(await fs.readdir(dir)).some((p) => p.startsWith("checkpoint-")));
    assert.deepEqual(await fs.readdir(dir), []);
    const trace = [...c.trace];
    reset();
    await api.checkpointScriptLedger(s);
    assert.equal(
        JSON.parse(await fs.readFile(join(dir, "checkpoint-0.json"))).ledger.attempts.length,
        1,
    );
    record("prepublish-" + stage, { trace, unchanged: true, retryAfterDefiniteFailure: true });
}
{
    const { l, id, dir, s } = await fresh();
    c.partial = true;
    await reject(api.checkpointScriptLedger(s), "io");
    assert.deepEqual(await fs.readdir(dir), []);
    reset();
    api.appendScriptPolicy(l, id);
    await api.checkpointScriptLedger(s);
    record("partial-write", { noDestination: true, cleanup: true });
}
for (const [stage, after] of [
    ["link", false],
    ["link", true],
    ["unlink", false],
    ["unlink", true],
    ["ack", false],
]) {
    const { l, id, dir, s } = await fresh();
    api.appendScriptPolicy(l, id);
    if (stage === "ack") {
        c.ack = true;
    } else {
        c.fail = stage;
        c.after = after;
    }
    await reject(api.checkpointScriptLedger(s), "indeterminate");
    assert.throws(() => api.appendScriptPolicy(l, id, "retry"), error("script-ledger", "owner"));
    await reject(api.checkpointScriptLedger(s), "owner");
    reset();
    const resolved = await api.resolveScriptLedgerCheckpoint(s);
    assert.equal(resolved === null, stage === "link" && !after);
    assert.equal(api.inspectScriptLedger(l).attempts.length, 1);
    if (resolved === null) {
        await api.checkpointScriptLedger(s);
    }
    assert.equal(
        JSON.parse(await fs.readFile(join(dir, "checkpoint-0.json"))).ledger.attempts.length,
        1,
    );
    record(stage + "-" + (after ? "after" : "before"), {
        resolution: resolved === null ? "absent-unlocked-no-retry" : "acknowledged",
        noDuplicate: true,
    });
}
{
    const { l, id, dir, s } = await fresh();
    await fs.writeFile(join(dir, "checkpoint-0.json"), "occupied");
    await reject(api.checkpointScriptLedger(s), "indeterminate");
    await reject(api.resolveScriptLedgerCheckpoint(s), "bytes");
    assert.equal(await fs.readFile(join(dir, "checkpoint-0.json"), "utf8"), "occupied");
    assert.throws(() => api.appendScriptPolicy(l, id), error("script-ledger", "owner"));
    record("collision", { retained: "occupied", locked: true });
}
for (const stage of ["lstat", "realpath", "read", "context"]) {
    const { l, s } = await fresh();
    const cp = await api.checkpointScriptLedger(s),
        before = api.inspectScriptLedger(l);
    if (stage === "context") {
        c.context = true;
    } else {
        c.fail = stage;
    }
    await reject(
        api.reopenScriptLedger(cp),
        stage === "read" ? "bytes" : stage === "context" ? "context" : "path",
    );
    reset();
    assert.deepEqual(api.inspectScriptLedger(l), before);
    await api.reopenScriptLedger(cp);
    record("reopen-" + stage, { oldOwnerRetainedOnFailure: true, tokenNotConsumed: true });
}
for (const stage of ["lstat", "realpath", "mkdir", "context"]) {
    reset();
    const selected = await plan.prepareScriptSelection(options),
        l = api.newScriptLedger(selected),
        before = api.inspectScriptLedger(l);
    if (stage === "context") {
        c.context = true;
    } else {
        c.fail = stage;
    }
    await reject(
        api.createScriptLedgerStore(join(run, "failed-create-" + stage), l),
        stage === "context" ? "context" : stage === "mkdir" ? "io" : "path",
    );
    reset();
    assert.deepEqual(api.inspectScriptLedger(l), before);
    await api.createScriptLedgerStore(join(run, "recovered-create-" + stage), l);
    record("create-" + stage, { reservationReleased: true });
}
{
    const { l, id, s } = await fresh();
    await api.checkpointScriptLedger(s);
    api.appendScriptPolicy(l, id);
    api.privateControl(s, "counter");
    await reject(api.checkpointScriptLedger(s), "snapshot");
    assert.equal(api.inspectScriptLedger(l).attempts.length, 1);
    record("counter-overflow", { noPublication: true });
}
{
    const { s } = await fresh();
    api.privateControl(s, "history");
    await reject(api.checkpointScriptLedger(s), "snapshot");
    record("private-history", { defensiveOnly: true });
}
{
    const { l, s } = await fresh();
    const pending = api.checkpointScriptLedger(s);
    await reject(api.checkpointScriptLedger(s, 1), "arguments");
    await reject(api.reopenScriptLedger({}), "token");
    assert.throws(() => api.appendScriptPolicy(l, {}, {}), error("script-ledger", "arguments"));
    assert.throws(
        () => api.appendScriptPolicy(l, "unknown", "bad"),
        error("script-ledger", "owner"),
    );
    await pending;
    record("busy-error-order", { argumentsBeforeOwner: true, ownerBeforeSlot: true });
}
console.log(JSON.stringify({ run, controls: results.length }));
