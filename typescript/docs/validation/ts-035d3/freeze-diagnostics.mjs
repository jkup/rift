// Editorial source anchors only. No parser or audit is imported.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(readFileSync('docs/validation/ts-035d3/frozen.json'));
const entries=[
 ...['P04','P06','P07','P15','E13','E15','E21','E23','E50'].map(id=>[id,'a,a',2,'duplicate parameter: a']),
 ...['E12','E14'].map(id=>[id,'b,b',2,'duplicate parameter: b']),
 ['S21-raw','param, param',7,'duplicate parameter: param'],
 ['E25','delete x',0,'delete of an identifier is not allowed'],
 ['E27','function g',0,'non-strict block function planning is unsupported'],
 ...['E28','E29','E49'].map(id=>[id,'function g',9,'duplicate-lexical: g']),
 ['E30','let x',4,'duplicate-lexical: x'],['E31','var x',4,'lexical-var: x'],
 ['E32','let a',4,'formal-lexical: a'],['E34','let x',4,'duplicate-lexical: x'],
 ...['E33','E51'].map(id=>[id,'catch(e)',6,'unsupported catch binding conflict or non-strict catch'])
];
assert.equal(entries.length,23);
const expected={};
for(const [id,anchor,offset,message] of entries){
 const text=rows.find(r=>r.id===id).text,start=text.lastIndexOf(anchor);assert.ok(start>=0,id);
 const prefix=text.slice(0,start+offset),lines=prefix.split('\n');
 expected[id]={phase:'parse',name:'SyntaxError',message,loc:{line:lines.length,column:lines.at(-1).length+1}};
}
writeFileSync('docs/validation/ts-035d3/blocked-diagnostics.json',JSON.stringify(expected,null,2)+'\n');
