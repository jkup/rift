import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { probeVerdict } from '../../../../tools/probe-verdict.mjs';
const labels = [
    'semantic matrix basic globals locals references completions budgets',
    'thirteen restricted traces every resource prefix seeded and fresh',
    'literal root function block global prefix counts',
    'N01-N04 original-node naming and source',
    'captured owner two active sessions escaping B sentinel restored A exact frames',
    'cross Realm original records allocation restricted provenance',
    'exact guest completion location one-use direct replay denial',
    'FDI every eighteen-tick setup prefix with shared source-unit budget',
    'strict this and configurable restricted endpoint mutation neighbors',
    'reachable accessor coercion body host faults and depth257 cleanup',
    'mixed cross Realm call permit tuple neighbors grammar and retained effects',
    'nested step call restoration closure persistence nonextensible existing global',
    'shared expressions arrays builtin callbacks conversions cached property references',
];
const results = [];
const gate = JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/script-execution.ts');
assert.ok(gate);
try {
    for (const input of ['seed','other']) {
        const row={input};
        for (const lane of ['node','native']) {
            const file=`fixtures/script-execution/${input}.txt`;
            const r=spawnSync(lane==='node'?process.execPath:'build/native/script-execution.exe',lane==='node'?['build/node/test/script-execution.js',file]:[file],{encoding:'utf8',timeout:60000});
            row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
        }
        results.push(row);
        assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));
        const expected=`PASS runtime function ${input}\n`+labels.map(x=>`PASS ${x}\n`).join('');
        for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
    }
} finally {writeFileSync(new URL('execution-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');}
console.log('PASS both runtime inputs Node/native with literal expectations and separate zero-dynamic gate');
