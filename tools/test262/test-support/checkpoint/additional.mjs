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
async function operation(name,fn,destination=false) {
 const item=c.queue?.[0]; if(item?.name===name && (!item.destination || destination)){c.queue.shift();c.trace.push(name);throw Object.assign(Error(name),{code:item.code});}
 c.trace.push(name);
 const fail=c.fail===name;
 if(fail && !c.after) {c.fail=null;throw Object.assign(Error('injected '+name),{code:c.errno??'EIO'});}
 const result=await fn();
 if(fail && c.after) {c.fail=null;throw Object.assign(Error('after '+name),{code:'EIO'});}
 return result;
}
export const mkdir=(...a)=>operation('mkdir',()=>fs.mkdir(...a));
export const lstat=(...a)=>operation('lstat',()=>fs.lstat(...a),String(a[0]).endsWith('checkpoint-0.json'));
export const realpath=(...a)=>operation('realpath',()=>fs.realpath(...a));
export const link=(...a)=>operation('link',()=>fs.link(...a));
export const unlink=(...a)=>operation('unlink',()=>fs.unlink(...a));
export const readFile=(...a)=>operation('read',()=>fs.readFile(...a));
export async function open(...a){const h=await operation('open',()=>fs.open(...a));(c.handles??=[]).push(h);return {
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
 const state=stores.get(token);
 if(action==='inspect')return {pending:state.pending,anchor:state.anchor,owner:state.owner,
   value:ledgers.get(state.owner),diagnostics:structuredClone(state.diagnostics),busy:state.busy};
 if(action==='counter')state.anchor.generation=Number.MAX_SAFE_INTEGER;
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
        queue: [],
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
// Additional frozen-contract cases not covered by the original 22 controls.
// This file is appended to the same isolated copied-source adapter.
{
    const { l, id, dir, s } = await fresh();
    api.appendScriptPolicy(l, id);
    const before = api.inspectScriptLedger(l),
        report = api.reportScriptLedger(l);
    c.queue = [
        { name: "write", code: "ENOSPC" },
        { name: "close", code: "EBUSY" },
        { name: "unlink", code: "EACCES" },
    ];
    await reject(api.checkpointScriptLedger(s), "io");
    const state = api.privateControl(s, "inspect");
    assert.equal(state.pending, null);
    assert.equal(state.anchor, null);
    assert.equal(state.busy, false);
    assert.deepEqual(
        state.diagnostics.map(({ stage, code }) => ({ stage, code })),
        [
            { stage: "write", code: "ENOSPC" },
            { stage: "cleanup-close", code: "EBUSY" },
            { stage: "cleanup-unlink", code: "EACCES" },
        ],
    );
    assert.deepEqual(api.inspectScriptLedger(l), before);
    assert.deepEqual(api.reportScriptLedger(l), report);
    // Our adapter withheld close deliberately. Keep that test-owned fd live until
    // diagnostics are asserted, then close it explicitly; production has no hook.
    for (const handle of c.handles ?? []) {
        await handle.close();
    }
    c.handles = [];
    const leftovers = await fs.readdir(dir);
    assert.equal(leftovers.length, 1);
    assert(leftovers[0].startsWith(".pending-"));
    const retained = await fs.readFile(join(dir, leftovers[0]));
    reset();
    await api.checkpointScriptLedger(s);
    assert.deepEqual(await fs.readFile(join(dir, leftovers[0])), retained);
    assert.deepEqual(api.privateControl(s, "inspect").diagnostics, state.diagnostics);
    record("prelink-cleanup-diagnostics", {
        ordered: true,
        originalIoWins: true,
        exactOldTempPreserved: true,
        explicitFreshRetry: true,
    });
}
{
    const { l, dir, s } = await fresh();
    c.fail = "link";
    await reject(api.checkpointScriptLedger(s), "indeterminate");
    const before = api.privateControl(s, "inspect");
    for (const stage of ["read", "lstat"]) {
        // A destination is independently supplied only inside this private fault fixture.
        await fs.writeFile(join(dir, "checkpoint-0.json"), before.pending.bytes);
        reset();
        if (stage === "lstat") {
            c.queue = [{ name: "lstat", code: "EACCES", destination: true }];
        } else {
            c.fail = "read";
        }
        await reject(api.resolveScriptLedgerCheckpoint(s), "bytes");
        const after = api.privateControl(s, "inspect");
        assert.equal(after.pending, before.pending);
        assert.equal(after.value, before.value);
        assert.equal(after.anchor, before.anchor);
        assert.throws(() => api.inspectScriptLedger(l), error("script-ledger", "owner"));
    }
    reset();
    await api.resolveScriptLedgerCheckpoint(s);
    assert.equal(api.inspectScriptLedger(l).attempts.length, 0);
    record("resolution-read-stat-failure", { pendingPreserved: true, recovered: true });
}
{
    reset();
    const selection = await plan.prepareScriptSelection(options),
        l = api.newScriptLedger(selection),
        before = api.inspectScriptLedger(l);
    const dir = join(run, "existing-directory");
    await fs.mkdir(dir);
    await fs.writeFile(join(dir, "sentinel"), "unchanged");
    await reject(api.createScriptLedgerStore(dir, l), "io");
    assert.equal(await fs.readFile(join(dir, "sentinel"), "utf8"), "unchanged");
    for (const invalid of ["relative", dir + "/.."]) {
        await reject(api.createScriptLedgerStore(invalid, l), "path");
    }
    assert.deepEqual(api.inspectScriptLedger(l), before);
    const s = await api.createScriptLedgerStore(join(run, "fresh-after-path-failures"), l);
    for (const token of [s, await api.checkpointScriptLedger(s)]) {
        assert.equal(Object.getPrototypeOf(token), Object.prototype);
        assert.deepEqual(Reflect.ownKeys(token), []);
        assert(Object.isFrozen(token));
    }
    assert.throws(
        () => api.newScriptLedger(selection),
        error("script-ledger", "already-used-selection"),
    );
    record("exclusive-directory-and-opaque-tokens", {
        existingPreserved: true,
        noConsumptionRefund: true,
    });
}
{
    const { l, s } = await fresh();
    const pending = api.checkpointScriptLedger(s);
    assert.throws(() => api.reportScriptLedger(l), error("script-ledger", "owner"));
    await reject(api.resolveScriptLedgerCheckpoint(s), "owner");
    const cp = await pending,
        reopening = api.reopenScriptLedger(cp);
    await reject(api.checkpointScriptLedger(s), "owner");
    await reject(api.reopenScriptLedger(cp), "owner");
    assert.throws(() => api.inspectScriptLedger(l), error("script-ledger", "owner"));
    const next = await reopening;
    assert.equal(api.inspectScriptLedger(next).attempts.length, 0);
    assert.throws(() => api.appendScriptPolicy(l, "unknown"), error("script-ledger", "owner"));
    record("reopen-synchronous-lock", { readAndMutationLocked: true, revocation: true });
}
console.log(JSON.stringify({ run, additionalControls: results.length }));
