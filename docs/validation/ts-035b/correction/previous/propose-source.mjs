import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,path='src/script-execution-internal.ts';
const original=readFileSync(path,'utf8');let proposed=original;
const edits=[];
function replace(before,after,label){assert.equal(proposed.split(before).length,2,label);proposed=proposed.replace(before,after);edits.push({label,before,after});}
replace('    #lastAbrupt: ScriptSourceSnapshot | null = null;',
`    #lastAbrupt: ScriptSourceSnapshot | null = null;
    // Synthetic inspection Gets have an original source anchor, but execute in
    // the entry/builtin Realm. Actual Script code temporarily suspends it.
    #inspectionSource: { record: ExecutableScript; unitId: string; loc: Location } | null = null;`,'private source-only anchor');
replace(`        const loc = completion.diagnostic.loc;
        this.#lastAbrupt = { realm: frame.realm, record: frame.record,
            unitId: ExecutableScript.state(frame.record, executionKey).plan.unit.id,`,
`        const anchor = this.#inspectionSource;
        const loc = anchor === null ? completion.diagnostic.loc : anchor.loc;
        const record = anchor === null ? frame.record : anchor.record;
        this.#lastAbrupt = { realm: frame.realm, record,
            unitId: anchor === null ? ExecutableScript.state(record, executionKey).plan.unit.id : anchor.unitId,`,'fallback capture keeps actual execution Realm');
replace(`        const savedAbrupt = this.#abrupt, savedSource = this.#lastAbrupt;
        this.#abrupt = null;
        this.#lastAbrupt = null;`,
`        if (source === null) throw new Error("missing original throw source");
        const savedAbrupt = this.#abrupt, savedSource = this.#lastAbrupt;
        const savedInspectionSource = this.#inspectionSource;
        this.#abrupt = null;
        this.#lastAbrupt = null;
        this.#inspectionSource = { record: source.record, unitId: source.unitId,
            loc: { line: source.loc.line, column: source.loc.column } };`,'activate copied original source for fixed Gets');
replace(`            this.#abrupt = savedAbrupt;
            this.#lastAbrupt = savedSource;`,
`            this.#abrupt = savedAbrupt;
            this.#lastAbrupt = savedSource;
            this.#inspectionSource = savedInspectionSource;`,'restore anchor on every inspection exit');
const start=proposed.indexOf('    #executeScriptFunction(fn: ScriptGuestCallable, receiver: Value, args: Value[]): ValueCompletion {');
const end=proposed.indexOf('    #callScript(',start);
assert.ok(start>0&&end>start);
const method=proposed.slice(start,end),lines=method.trimEnd().split('\n');
assert.equal(lines.at(-1),'    }');
const wrapped=lines[0]+`\n        const savedInspectionSource = this.#inspectionSource;
        this.#inspectionSource = null;
        try {\n`+lines.slice(1,-1).map(line=>'    '+line).join('\n')+`\n        } finally {
            this.#inspectionSource = savedInspectionSource;
        }
    }
`;
replace(method,wrapped,'suspend through all real guest setup/body, independent of record identity');
const output=here+'/proposed-source.ts.txt';writeFileSync(output,proposed);
const diff=spawnSync('git',['diff','--no-index','--',path,output],{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(diff.status,1);
writeFileSync(here+'/proposed-source.patch',diff.stdout);
const hash=b=>createHash('sha256').update(b).digest('hex');
writeFileSync(here+'/proposed-source.json',JSON.stringify({productionPath:path,originalSha256:hash(original),proposedSha256:hash(proposed),applied:false,edits},null,2)+'\n');
assert.equal(readFileSync(path,'utf8'),original);
console.log('PASS rendered five exact private edits; production unchanged');
