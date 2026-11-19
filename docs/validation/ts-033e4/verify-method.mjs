import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const expected=[
    ['method-minimal','true\nfalse\n',1,'',2],
    ['method-direct-control','true\nfalse\n',0,'true\nfalse\n',0],
    ['method-call-tick','call authentic PASS\ntick authentic PASS\ncounters 1 3\n',0,'call authentic FAIL\ntick authentic FAIL\ncounters 0 0\n',4],
    ['method-getter-view','call authentic PASS\ntick authentic PASS\ncounters 1 3\n',0,'call authentic PASS\ntick authentic PASS\ncounters 1 3\n',4],
];
const checks=[];
for(const [name,nodeText,nativeStatus,nativeText,dynamic] of expected){
    const row=JSON.parse(readFileSync(new URL(name+'-results.json',import.meta.url)));
    assert.equal(row.node.status,0);assert.equal(row.node.stdout,nodeText);assert.equal(row.node.stderr,'');
    assert.equal(row.build.status,0);assert.equal(row.build.stderr,'');assert.equal(row.coverage.status,0);
    assert.equal(row.native.status,nativeStatus);assert.equal(row.native.stdout,nativeText);
    if(nativeStatus===1)assert.match(row.native.stderr,/expected Receiver.*got undefined/);
    else assert.equal(row.native.stderr,'');
    const report=row.coverage.stdout;
    const count=/in dynamic tier\s+(\d+)/.exec(report);
    assert.equal(count?Number(count[1]):0,dynamic);
    if(dynamic)assert.match(report,/dyn\.this/);
    const args=['node_modules/typescript/bin/tsc','--ignoreConfig','--noEmit','--strict','--target','ES2024','--module','nodenext','docs/validation/ts-033e4/'+name+'.ts'];
    const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000});
    checks.push({name,kind:'retained compiler diagnostic assertions; NOT E4 acceptance',typecheck:{args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''}});
    writeFileSync(new URL('method-verification.json',import.meta.url),JSON.stringify(checks,null,2)+'\n');
    assert.equal(r.status,0,r.stdout+r.stderr);
    console.log(name+': literal diagnostic verified; strict typecheck passed');
}
