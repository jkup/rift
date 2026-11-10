import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
test('dispatch controls retain identity, histories and current admissions on both hosts',()=>{
  for(const name of ['assignment-target','lexical-statement','strict-parameter']){
    const driver='script-'+name+'-dispatch',fixture=(name==='lexical-statement'?'test/fixtures/':'fixtures/')+driver;
    const args=[fixture+'/alpha.js','same','controls',fixture+'/beta.js'];
    const outputs=[];
    for(const lane of ['node','native']){
      const command=lane==='node'?process.execPath:join(root,'build/native',driver+(process.platform==='win32'?'.exe':''));
      const child=spawnSync(command,lane==='node'?[join(root,'build/node/test',driver+'.js'),...args]:args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
      assert.equal(child.status,0,driver+' '+lane+': '+child.stderr);assert.equal(child.signal,null);assert.equal(child.error,undefined);assert.equal(child.stderr,'');
      outputs.push(child.stdout);
      const result=JSON.parse(child.stdout),{histories,...metadata}=result;
      assert.deepEqual(metadata,{checks:name==='strict-parameter'?192:864,runtimeInputs:2,...(name==='strict-parameter'?{}:{effectSources:3}),orders:2,seededHistories:2,realms:2,profiles:3,sameId:6,ready:2});
      if(name==='lexical-statement'){
        assert.equal(histories.length,72);
        for(const raw of histories){
          const h=JSON.parse(raw);assert.deepEqual(h.before,h.after);assert.equal(h.before.active,null);
          if(h.seeded){assert.equal(h.savedCompletion.type,'throw');assert.deepEqual(h.savedCompletion.value,{kind:'number',value:3});}
          else assert.equal(h.savedCompletion,null);
        }
      }else assert.equal(histories,undefined);
    }
    assert.equal(outputs[0],outputs[1],driver+' exact control bytes');
  }
});
