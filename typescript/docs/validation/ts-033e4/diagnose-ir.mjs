import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const dir='docs/validation/ts-033e4/';
const compiler=join(root,'node_modules/scriptc/bin/scriptc.exe');
function run(command,args){const r=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:60000});return {command,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
function walk(v,visit){if(!v||typeof v!=='object')return;visit(v);for(const child of Object.values(v))walk(child,visit);}
const results=[];
for(const [name,extension] of [['receiver-minimal','ts'],['method-getter-view','ts'],['receiver-source-kind','js']]){
    const source=dir+name+'.'+extension,irPath=dir+name+'.ir.json';
    const emit=run(compiler,['build',source,'--tier','static-only','--emit','ir','-o',irPath]);
    assert.equal(emit.status,0,emit.stderr);
    const ir=JSON.parse(readFileSync(join(root,irPath)));
    const calls=[],receiverReads=[];
    for(const f of ir.functions)walk(f.body,v=>{
        if(v.kind==='callValue'||v.kind==='dynCall'||v.kind==='dynInvoke')calls.push({function:f.name,kind:v.kind,receiver:v.receiver??v.recv??null,callee:v.callee??v.method,loc:v.loc});
        if(v.kind==='libCall'&&v.fn==='dyn.this')receiverReads.push({function:f.name,expr:v});
    });
    const row={name,emit,irVersion:ir.irVersion,calls,receiverReads,globals:ir.globals};
    if(name==='receiver-minimal'){
        assert.equal(calls.length,1);assert.equal(calls[0].receiver,null);assert.equal(calls[0].kind,'callValue');assert.equal(receiverReads.length,1);
    }
    if(name==='method-getter-view'){
        assert.equal(ir.globals.find(g=>g.name==='context').type.kind,'dyn');
        assert.ok(calls.filter(c=>c.kind==='dynCall'&&c.receiver!==null).length>=2);
        assert.ok(receiverReads.length>=2);
    }
    if(name==='receiver-source-kind'){
        assert.ok(calls.some(c=>c.receiver!==null));
        const binary=join(root,'build/ts-033e4-method/receiver-source-kind.exe');
        row.node=run(process.execPath,[source]);
        row.build=run(compiler,['build',source,'--tier','static-only','-o',binary]);
        row.coverage=run(compiler,['coverage',source,'--explain-dynamic']);
        if(row.build.status===0)row.native=run(binary,[]);
        results.push(row);writeFileSync(new URL('compiler-ir-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
        assert.equal(row.build.status,0,row.build.stderr);assert.equal(row.node.status,0);assert.equal(row.native.status,0,row.native.stderr);
        assert.equal(row.node.stdout,'true\n');assert.equal(row.native.stdout,'true\n');
        assert.match(row.coverage.stdout,/in dynamic tier\s+[1-9]/);
    }else results.push(row);
    console.log(name+': expected receiver IR verified');
}
writeFileSync(new URL('compiler-ir-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
