// Materialize typed literals from the frozen oracle, never from codec output.
import { readFileSync, writeFileSync } from 'node:fs';
const rows=JSON.parse(readFileSync(new URL('../../../test/fixtures/script-observation-serialization/frozen.json',import.meta.url)));
let text='// Frozen synthetic data only. No guest execution or protocol parsed from stdout.\nimport { readFileSync } from "node:fs";\nimport type { ChildV2 } from "../src/script-observation-types.js";\nimport { scriptObservationJSONRecord } from "../src/script-observation-json.js";\nconst input = readFileSync(process.argv[2], "utf8");\nif (input !== "alpha" && input !== "beta") throw new Error("input");\n';
for (const input of ['alpha','beta']) {
  text+=`if (input === "${input}") {\n`;
  for (const [i,row] of rows.filter(r=>r.binding.nonce===input).entries()) {
    text+=`    const row${i}: ChildV2 = ${JSON.stringify(row.child)};\n    console.log(scriptObservationJSONRecord(row${i}));\n`;
  }
  text+='}\n';
}
writeFileSync(new URL('../../../test/script-observation-serialization.ts',import.meta.url),text);
