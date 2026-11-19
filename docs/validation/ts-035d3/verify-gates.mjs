// Validate the original sweep and, only for its retained linker failure, the
// separately executed raw retry. Never rewrite or reclassify a failed record.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completed} from '../../../tools/probe-verdict.mjs';
export function verifyGates(gates){
 assert.equal(gates.length,66);
 const failures=gates.filter(g=>g.verdict!=='PASS');
 assert.ok(failures.length<=1);
 for(const g of gates){
  assert.ok(completed(g.coverage),g.entry+' coverage process');
  const report=g.coverage.stdout,a=report.match(/statements analyzed\s+(\d+)/),s=report.match(/compile statically\s+(\d+)\s+\(100%\)/);
  assert.ok(a&&s&&Number(a[1])>0&&a[1]===s[1],g.entry+' coverage counts');
  assert.ok(report.includes('fully static — all analyzed statements compile to native code.'));
  assert.ok(!/in dynamic tier\s+[1-9]/.test(report));
  if(g.verdict==='PASS'){assert.ok(completed(g.build),g.entry+' actual build');continue;}
  assert.equal(g.entry,'test/script-global-declarations.ts');
  assert.equal(g.verdict,'BUILD-FAIL');assert.match(g.build.stderr,/ntdll\.lib cache check failed: file_open FileNotFound/);
  const h='docs/validation/ts-035d3/';
  assert.equal(readFileSync(h+'linker-retry-build-exit.txt','utf8').trim(),'0');
  assert.equal(readFileSync(h+'linker-retry-coverage-exit.txt','utf8').trim(),'0');
  assert.match(readFileSync(h+'linker-retry-build.log','utf8'),/build\\native\\script-global-declarations\.exe/);
  const retry=readFileSync(h+'linker-retry-coverage.log','utf8');
  assert.match(retry,/statements analyzed\s+4259/);assert.match(retry,/compile statically\s+4259\s+\(100%\)/);
  assert.ok(retry.includes('fully static — all analyzed statements compile to native code.'));assert.ok(!/in dynamic tier\s+[1-9]/.test(retry));
 }
 return {sweepPasses:gates.length-failures.length,retainedLinkFailures:failures.length,successfulSeparateRetries:failures.length};
}
