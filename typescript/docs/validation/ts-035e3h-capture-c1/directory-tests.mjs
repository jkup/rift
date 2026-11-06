import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {extract} from './extraction.mjs';
const here=import.meta.dirname,prior=join(here,'../ts-035e3h-capture-p'),observations=[];
const load=async s=>import('data:text/javascript;base64,'+Buffer.from(extract(s)).toString('base64'));
const original=await load(fs.readFileSync(join(prior,'runner.mjs.proposed.txt'),'utf8'));
const corrected=await load(fs.readFileSync(join(here,'runner.mjs.proposed.txt'),'utf8'));
const root=fs.mkdtempSync(resolve(here,'../../../build/ts035e3h-capture-c1-'));
const test=(name,fn)=>{fn();observations.push({name,status:'passed'});};
const rejects=(fn,pattern)=>assert.throws(fn,e=>e.code==='ERR_ASSERTION'&&pattern.test(e.message));
try{
 const good=join(root,'good');fs.mkdirSync(good);fs.mkdirSync(join(good,'capture'));
 const expected=JSON.parse(fs.readFileSync(join(prior,'model-literals.json'))).find(f=>f.id==='one-visible-is-not-one-total').input.files;
 for(const f of expected)fs.writeFileSync(join(good,'capture',f.name),Buffer.from(f.hex,'hex'),{flag:'wx'});
 test('original-directory-defect-reproduced',()=>rejects(()=>original.snapshot({root:good}),/kind\/links/));
 test('corrected-directory-extracts-exact-files',()=>assert.deepEqual(corrected.snapshot({root:good}),[...expected].sort((a,b)=>a.name.localeCompare(b.name))));
 const regular=join(root,'regular');fs.mkdirSync(regular);fs.writeFileSync(join(regular,'capture'),'not a directory',{flag:'wx'});
 test('regular-file-root-rejected',()=>rejects(()=>corrected.snapshot({root:regular}),/kind\/links/));
 const alias=join(root,'alias');fs.mkdirSync(alias);fs.symlinkSync(join(good,'capture'),join(alias,'capture'),'junction');
 test('junction-root-rejected',()=>rejects(()=>corrected.snapshot({root:alias}),/alias /));
 const hard=join(root,'hard');fs.mkdirSync(hard);fs.mkdirSync(join(hard,'capture'));fs.writeFileSync(join(hard,'capture','one.bin'),'abc',{flag:'wx'});fs.linkSync(join(hard,'capture','one.bin'),join(hard,'capture','two.bin'));
 test('hardlinked-snapshot-file-rejected',()=>rejects(()=>corrected.snapshot({root:hard}),/kind\/links/));
 const inventory=[];function walk(path){const s=fs.lstatSync(path,{bigint:true}),r={path,dev:String(s.dev),ino:String(s.ino),nlink:String(s.nlink)};if(s.isSymbolicLink()){inventory.push({...r,kind:'alias',target:fs.readlinkSync(path)});return;}if(s.isDirectory()){inventory.push({...r,kind:'directory'});for(const name of fs.readdirSync(path))walk(join(path,name));return;}const b=fs.readFileSync(path);inventory.push({...r,kind:'file',bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}walk(root);
 fs.writeFileSync(process.argv[2],JSON.stringify({status:'passed',observations,root,inventory,controllerInvocations:0,recorderExecutions:0,compilerInvocations:0},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'passed',controls:observations.length,controllerInvocations:0}));
}catch(e){fs.writeFileSync(process.argv[2],JSON.stringify({status:'failed',observations,root,error:{name:e.name,message:e.message,stack:e.stack}},null,2)+'\n',{flag:'wx'});throw e;}
