// Derive a separate editorial fixture runner; never load changed decoder code.
import {readFileSync,writeFileSync} from 'node:fs';
const here=new URL('./',import.meta.url);
let s=readFileSync(new URL('../ts-035d4-p/wire.mjs',here),'utf8');
s=s.replace("const old=JSON.parse(readFileSync(new URL('../ts-035d2-p/wire-matrix.json',import.meta.url)));","const old=JSON.parse(readFileSync(new URL('../ts-035d4-p/wire-matrix.json',import.meta.url)));");
s=s.replace("'D3/'+(input==='alpha'?'R0':'R1')","(input==='alpha'?'R0':'R1')");
s=s.replaceAll("'duplicate-strict-parameter'","'assignment-target'");
s=s.replace('source.selected.location','source.expected.candidates[0].target.loc');
s=s.replace("m.id!=='parameter-rule'","m.id!=='assignment-rule'");
s=s.replace("['duplicate-block-lexical-function';", "['duplicate-block-lexical-function';");
s=s.replace("['return-outside-function','duplicate-block-lexical-function',...","['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter',...");
s=s.replace('rows.length,96','rows.length,128');
s=s.replaceAll('Parameter malformed','Numeric malformed').replaceAll('parameter objects','numeric objects').replaceAll('not a modified','not a modified');
s=s.replaceAll('D4 producer','numeric producer');
writeFileSync(new URL('wire.mjs',here),s);
