// Read retained capture data only. No oracle changes or process invocation.
import * as fs from 'node:fs';
import {join} from 'node:path';
import {decode} from '../ts-035e3h-runtime-ready-p/format.mjs';
const here=import.meta.dirname,root=JSON.parse(fs.readFileSync(join(here,'runtime-inventory.json'))).root,oracle=JSON.parse(fs.readFileSync(join(here,'../ts-035e3h-runtime-ready-p/smoke-oracle.json')));
const record=decode(fs.readFileSync(join(root,'capture/first-command.bin')));if(record.kind!=='capture')throw Error('capture rejected');
function compare(actualHex,expectedHex){const a=Buffer.from(actualHex,'hex'),e=Buffer.from(expectedHex,'hex'),differences=[];let count=0;for(let i=0;i<Math.max(a.length,e.length)/2;i++){const actual=i*2<a.length?a.readUInt16LE(i*2):null,expected=i*2<e.length?e.readUInt16LE(i*2):null;if(actual!==expected){count++;if(differences.length<32)differences.push({unitIndex:i,expected:expected===null?null:expected.toString(16).padStart(4,'0'),actual:actual===null?null:actual.toString(16).padStart(4,'0')});}}return {equal:actualHex===expectedHex,expectedUnits:e.length/2,actualUnits:a.length/2,differenceCount:count,differences};}
const fields=Object.fromEntries(['rawHex','cwdHex','imageHex','environmentHex'].map(k=>[k,compare(record[k],oracle.decodedLiteral[k])]));
const argv=record.argvHex.map((hex,i)=>({index:i,...compare(hex,oracle.decodedLiteral.argvHex[i]??'')}));
const report={firstControllerFailure:'fields/rawHex',recordIdentity:{pid:record.pid,creationTime:record.creationTime},fields,argv,expectedArgc:oracle.decodedLiteral.argvHex.length,actualArgc:record.argvHex.length,interpretation:'Observed code-unit differences only. The capture does not isolate which layer converted the unpaired surrogate inputs. No normalization, rerun or oracle replacement.',runtimeOutcome:'failed-stop-review',totalAttempts:null,authority:'none'};
fs.writeFileSync(join(here,'field-differences.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
