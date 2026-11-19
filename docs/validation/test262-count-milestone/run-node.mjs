import {Worker, isMainThread, parentPort} from 'node:worker_threads';
import {readFileSync, writeFileSync, appendFileSync} from 'node:fs';
import {runFile} from './node-case.mjs';

if (!isMainThread) {
  parentPort.on('message', path => {
    const started = Date.now();
    try { parentPort.postMessage({...runFile(path), elapsedMs: Date.now() - started}); }
    catch (error) { parentPort.postMessage({path, status:'runner-error', reason:String(error), elapsedMs:Date.now()-started}); }
  });
  parentPort.postMessage({ready:true});
} else {
  const files = JSON.parse(readFileSync('cpp-selection.json', 'utf8'));
  writeFileSync('node-results.jsonl', '', {flag:'wx'});
  const summary = {label:'Pinned upstream harness; phase-aware synchronous Script measurement', selected:files.length, completed:0, counts:{}, startedAt:new Date().toISOString(), complete:false};
  let next = 0;
  function save() { writeFileSync('node-progress.json', JSON.stringify(summary,null,2)); }
  function record(result) {
    appendFileSync('node-results.jsonl', JSON.stringify(result)+'\n');
    summary.completed++;
    summary.counts[result.status]=(summary.counts[result.status]??0)+1;
    if(summary.completed%500===0) {save();console.log(JSON.stringify(summary));}
  }
  save();
  async function lane() {
    while(next<files.length) {
      const worker=new Worker(new URL(import.meta.url),{resourceLimits:{maxOldGenerationSizeMb:512}});
      await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
      let renew=false;
      for(let batch=0;batch<100 && next<files.length && !renew;batch++) {
        const path=files[next++];
        const result=await new Promise(resolve=>{
          const finish=value=>{clearTimeout(timer);worker.off('message',message);worker.off('error',error);resolve(value);};
          const message=value=>finish(value);
          const error=value=>{renew=true;finish({path,status:'host-fault',reason:String(value)});};
          const timer=setTimeout(()=>{renew=true;finish({path,status:'timeout',wallMs:10000});},10000);
          worker.once('message',message);worker.once('error',error);worker.postMessage(path);
        });
        record(result);
      }
      await worker.terminate();
    }
  }
  await Promise.all([lane(),lane()]);
  summary.complete=true;summary.finishedAt=new Date().toISOString();save();console.log(JSON.stringify(summary));
}
