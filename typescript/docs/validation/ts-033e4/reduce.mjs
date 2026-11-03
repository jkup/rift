import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=join(root,'build/ts-033e4-preflight');
mkdirSync(output,{recursive:true});
const compiler=join(root,'node_modules/scriptc/bin/scriptc.exe');
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout:60000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
const rows=[];
for(const name of ['receiver-minimal','receiver-control']){
    const source='docs/validation/ts-033e4/'+name+'.ts',binary=join(output,name+'.exe');
    const row={name,node:run(process.execPath,[source]),build:run(compiler,['build',source,'--tier','static-only','-o',binary]),coverage:run(compiler,['coverage',source,'--explain-dynamic'])};
    if(row.build.status===0)row.native=run(binary,[]);
    rows.push(row);
    writeFileSync(new URL('reduction-results.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
    assert.equal(row.node.status,0);assert.equal(row.node.stdout,'true\n');
    assert.equal(row.build.status,0,row.build.stderr);assert.equal(row.coverage.status,0);
    assert.equal(row.native?.status,0,row.native?.stderr);
    if(name==='receiver-minimal'){
        assert.equal(row.native.stdout,'false\n');
        assert.match(row.coverage.stdout,/in dynamic tier\s+2\b/);
        assert.match(row.coverage.stdout,/dyn\.this/);
    } else {
        assert.equal(row.native.stdout,'true\n');
        assert.doesNotMatch(row.coverage.stdout,/in dynamic tier\s+[1-9]/);
    }
    console.log(name+': retained expected diagnostic result');
}
