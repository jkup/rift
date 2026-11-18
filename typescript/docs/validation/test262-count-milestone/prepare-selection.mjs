import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {relative} from 'node:path';
import {findTestFiles,TEST262_DIR} from './cpp-direct-core.mjs';
const selection=JSON.stringify(findTestFiles().sort().map(path=>relative(TEST262_DIR,path)));
if(existsSync('cpp-selection.json')) {
  if(readFileSync('cpp-selection.json','utf8')!==selection) throw new Error('selection changed');
} else writeFileSync('cpp-selection.json',selection,{flag:'wx'});
