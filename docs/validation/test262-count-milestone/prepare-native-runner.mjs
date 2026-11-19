import {readFileSync,writeFileSync} from 'node:fs';
const inputs=[
  ['node-case.mjs','native-case.mjs',text=>text.replace('../node/src/script-observation.js','./native-observe.mjs')],
  ['node-controls.mjs','native-controls.mjs',text=>text.replace('./node-case.mjs','./native-case.mjs')],
  ['run-node.mjs','run-native.mjs',text=>text.replace('./node-case.mjs','./native-case.mjs').replaceAll('node-results.jsonl','native-results.jsonl').replaceAll('node-progress.json','native-progress.json').replaceAll('10000','15000')],
];
for(const [source,destination,transform] of inputs) {
  const text=readFileSync(source,'utf8');
  const output=transform(text);
  if(text===output) throw new Error('adaptation failed');
  writeFileSync(destination,output,{flag:'wx'});
}
