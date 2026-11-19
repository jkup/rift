import { corpusRoot, scratchRoot } from "./environment.mjs";
import { readFile, writeFile, mkdir, cp, mkdtemp } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { replaceImportSources } from "./source-structure.mjs";
export const evidence = resolve("docs/validation/ts-035e2a");
export { corpusRoot, scratchRoot };
export const json = async (path) => JSON.parse(await readFile(path));
export const save = async (name, value) =>
    writeFile(resolve(scratchRoot, name), JSON.stringify(value, null, 2) + "\n");
export function frozen(value) {
    if (value !== null && typeof value === "object") {
        assert(Object.isFrozen(value));
        for (const child of Object.values(value)) {
            frozen(child);
        }
    }
}
// Isolated copies only. No source replacement is applied to the real modules.
// Production planner logic is byte-identical except import destinations. The
// wrappers delegate real IO/comparisons, record order, and introduce faults at
// the returned-plan boundary. Successful differing E1 is defensive-only.
export async function sandbox(setup = null) {
    const root = await mkdtemp(resolve(scratchRoot, "plan-"));
    const modules = resolve(root, "tools/test262");
    await mkdir(modules, { recursive: true });
    for (const path of [
        "tools/test262/input.mjs",
        "tools/test262/script-capabilities.mjs",
        "tools/test262/script-capabilities.json",
        "tools/test262/script-plan.mjs",
        "tools/test262/script-ledger.mjs",
        "fixtures/assistance/test262-starter-corpus/manifest.json",
        "package.json",
        "package-lock.json",
    ]) {
        await mkdir(dirname(resolve(root, path)), { recursive: true });
        await cp(path, resolve(root, path));
    }
    await cp("node_modules/yaml", resolve(root, "node_modules/yaml"), { recursive: true });
    await writeFile(
        resolve(modules, "control.mjs"),
        `
export const control = { trace: [], second: false, authority: 'same', closure: 'same', initial: null };
`,
    );
    await writeFile(
        resolve(modules, "authority.mjs"),
        `
import {readScriptCapabilities as read, reconstructScriptDebts as debts} from './script-capabilities.mjs';
import {unlink,writeFile} from 'node:fs/promises';
import {control as c} from './control.mjs';
export async function readScriptCapabilities() {
 if(c.second) c.trace.push('authority-read');
 if(c.initial==='authority') throw new Error('initial authority');
 const result=await read();
 if(c.second && c.authority==='different') return {...result, unexpected:true};
 if(c.second && c.closure==='after-authority') await writeFile(new URL('./script-capabilities.json',import.meta.url),'changed after read');
 return result;
}
export function reconstructScriptDebts(...args) {
 if(c.initial==='debts') throw new Error('projection fault');
 return debts(...args);
}
`,
    );
    await writeFile(
        resolve(modules, "planned.mjs"),
        `
import {planCorpus as plan,sha256} from './input.mjs';
import {unlink,writeFile,appendFile} from 'node:fs/promises';
import {control as c} from './control.mjs';
export {sha256};
export async function planCorpus(options) {
 if(c.initial==='selection') throw new Error('host fault');
 const result=await plan(options);
 c.second=true;
 if(c.authority==='read-error') await unlink(new URL('./script-capabilities.json',import.meta.url));
 if(c.authority==='invalid-bytes') await writeFile(new URL('./script-capabilities.json',import.meta.url),'{}');
 if(c.closure==='read-error') await unlink(new URL('../../package-lock.json',import.meta.url));
 if(c.closure==='different') await appendFile(new URL('../../package-lock.json',import.meta.url),' ');
 return result;
}
`,
    );
    await writeFile(
        resolve(modules, "io.mjs"),
        `
import * as fs from 'node:fs/promises';
import {control as c} from './control.mjs';
export const readFile=fs.readFile, readdir=fs.readdir, realpath=fs.realpath;
export async function lstat(path) {
 if(String(path).replaceAll('\\\\','/').endsWith('/tools/test262/input.mjs')) {
  if(c.second && c.trace.at(-1)!=='closure-read') c.trace.push('closure-read');
  if(c.initial==='closure') throw new Error('initial closure');
 }
 return fs.lstat(path);
}
`,
    );
    await writeFile(
        resolve(modules, "compare.mjs"),
        `
import {isDeepStrictEqual as equal} from 'node:util';
import {control as c} from './control.mjs';
export function isDeepStrictEqual(a,b) {
 c.trace.push(a.kind==='script-runtime-capabilities'?'authority-compare':'closure-compare');
 if(c.maskDigest && a.closureSha256) b.closureSha256=a.closureSha256;
 return equal(a,b);
}
`,
    );
    await writeFile(
        resolve(modules, "uuid.mjs"),
        `
import {randomUUID as uuid} from 'node:crypto';
import {control as c} from './control.mjs';
export function randomUUID(){c.trace.push('publish');return uuid();}
`,
    );
    let source = await readFile(resolve(modules, "script-plan.mjs"), "utf8");
    source = replaceImportSources(source, {
        "node:fs/promises": "./io.mjs",
        "node:util": "./compare.mjs",
        "node:crypto": "./uuid.mjs",
        "./input.mjs": "./planned.mjs",
        "./script-capabilities.mjs": "./authority.mjs",
    });
    await writeFile(resolve(modules, "script-plan.mjs"), source);
    if (setup) {
        await setup(root, modules);
    }
    const api = await import(pathToFileURL(resolve(modules, "script-plan.mjs")));
    const { control } = await import(pathToFileURL(resolve(modules, "control.mjs")));
    return { root, modules, api, control };
}
