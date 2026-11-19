// Read-only upstream research; writes only this owned evidence directory.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const pin = 'd553e7b52501fbc47eae981c8d0fa7a5c26d0171';
const urls = [
  'https://262.ecma-international.org/16.0/',
  ...['src/api.mts', 'src/host-defined/engine.mts', 'src/parse.mts', 'src/execution-context/Environment.mts', 'src/abstract-ops/function-operations.mts', 'src/abstract-ops/execution-contexts.mts', 'LICENSE'].map(p => `https://raw.githubusercontent.com/engine262/engine262/${pin}/${p}`),
];
const records = [];
for (const url of urls) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString('utf8');
  const record = { url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), excerpts: [] };
  if (url.includes('ecma-international')) {
    for (const id of ['sec-directive-prologues-and-the-use-strict-directive','sec-strict-mode-code','sec-global-environment-records','sec-globaldeclarationinstantiation','sec-parse-script','sec-runtime-semantics-scriptevaluation','sec-ordinarycallbindthis']) {
      const start = text.indexOf(`<emu-clause id="${id}"`);
      if (start < 0) throw Error(`Missing clause ${id}`);
      const tags = /<emu-clause\b|<\/emu-clause>/g; tags.lastIndex = start;
      let depth = 0, end = start;
      for (let m; (m = tags.exec(text));) { depth += m[0][1] === '/' ? -1 : 1; if (depth === 0) { end = tags.lastIndex; break; } }
      const plain = text.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      record.excerpts.push({ id, text: plain });
    }
  } else {
    const lines = text.split('\n');
    // Store inspected source with numbered lines to make citations reproducible.
    record.excerpts = lines.map((text,i) => ({ line: i+1, text }));
  }
  records.push(record);
}
await writeFile(new URL('upstream.json', import.meta.url), JSON.stringify(records,null,2)+'\n');
console.log(records.map(r=>`${r.sha256} ${r.bytes} ${r.url}`).join('\n'));
const manifest = JSON.parse(await readFile(new URL('../../../fixtures/assistance/test262-starter-corpus/manifest.json', import.meta.url)));
const corpus = [];
for (const entry of [...manifest.entries, ...Object.entries(manifest.upstream.harnessBlobs).map(([path,blob])=>({id:path,path,blob})), {id:'LICENSE',path:'LICENSE'}]) {
  const url = `https://raw.githubusercontent.com/tc39/test262/${manifest.upstream.revision}/${entry.path}`;
  const response = await fetch(url); if (!response.ok) throw Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const blob = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
  if (entry.blob && blob !== entry.blob) throw Error(`blob mismatch ${entry.id}`);
  corpus.push({id:entry.id,url,blob,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,text:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)});
}
await writeFile(new URL('corpus.json', import.meta.url),JSON.stringify(corpus,null,2)+'\n');
console.log(`Verified ${corpus.length-1} selected test/harness blobs; retained upstream license.`);
