// Offline design evidence only. No guest execution, network, builds or admission.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { variants, blockers } from '../../../tools/test262/input.mjs';
import { parseDriverResult } from '../../../tools/test262/driver-result.mjs';
import { parseEnvelope } from '../../../tools/test262/result.mjs';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const base = '297f8e29cb9aa8d865e832291a9c8bf7df5cc06c';
const git = args => execFileSync('git', args, {cwd:root, encoding:'utf8'}).trim();
const read = p => readFileSync(resolve(root,p));
const sha = b => createHash('sha256').update(b).digest('hex');
const changed = git(['diff','--name-only',base]).split('\n').filter(Boolean);
const owned = p => p === 'typescript/TASKS.md' || p === 'typescript/docs/script-admission.md' || p.startsWith('typescript/docs/validation/ts-035p/');
const foreignChanges = changed.filter(p => !owned(p) && p !== 'typescript/COORDINATION.md');
if (foreignChanges.length) throw new Error('protected changes: '+foreignChanges.join(','));
const tracked = git(['ls-files']).split('\n');
const manifestPath='typescript/fixtures/assistance/test262-starter-corpus/manifest.json';
const manifest = JSON.parse(read(manifestPath));
const planned = manifest.entries.flatMap(e => {
  const meta={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};
  return variants(meta).map(v=>({id:e.id,variant:v,blockers:blockers(meta,v,e.id)}));
});
if (planned.length !== 60 || planned.some(v=>v.blockers.length===0)) throw new Error('denominator/blockers');
const files = [
  'src/observation.ts','src/observation-json.ts','src/observation-driver.ts',
  'src/script-execution-internal.ts','src/script-execution.ts','src/script-record.ts',
  'src/runtime.ts','src/realm.ts','src/parser.ts','src/script-declarations.ts','src/outcomes.ts',
  'tools/test262/driver-result.mjs','tools/test262/result.mjs','tools/test262/input.mjs',
  'tools/test262/observe.mjs','tools/test262/plan.mjs','tools/test262/ledger.mjs',
  'tools/build-native.mjs','tools/run-guests.mjs','package.json','tsconfig.json',
  'docs/script-execution.md','docs/harness-prerequisites.md',
].map(p=>'typescript/'+p);
const rejects = fn => {try {fn();return false;} catch {return true;}};
const child={driverVersion:1,nonce:'audit',mode:'parser-observation',unit:'test/a.js',stage:'test',bodyEvaluated:false,location:null,observation:{kind:'normal'}};
const binding={nonce:'audit',mode:'parser-observation',unit:'test/a.js'};
parseDriverResult(Buffer.from(JSON.stringify(child)),binding);
const v1RejectsV2 = rejects(()=>parseDriverResult(Buffer.from(JSON.stringify({...child,driverVersion:2})),binding));
// A literal v1 outer observation with null unavailable identities is valid;
// schemaVersion alone cannot be widened to 2.
const outer={identity:{schemaVersion:1,runId:'audit',mode:'parser-observation',corpusRevision:null,manifestSha256:null,path:'test/a.js',blob:null,sourceSha256:null,variant:'strict',goal:'Script',lane:'node',engineCommit:null,engineBuildSha256:null,adapterSha256:null,policySha256:null,dirtySourceSha256:null},inputs:{harness:[],transformedSourceSha256:null,profileId:null,capabilityLedgerSha256:null,host:null,platform:null,toolchain:null,limits:{sourceUnits:null,parseDepth:null,steps:null,calls:null,evaluationDepth:null,wallMs:null,outputBytes:null}},evidence:{stage:'test',harnessValidated:false,bodyEvaluated:false,unit:'test/a.js',location:null,process:{exitCode:0,signal:null,deadlineExpired:false},stdoutSha256:null,stderrSha256:null,elapsedMs:null},observation:{kind:'normal'}};
parseEnvelope(JSON.stringify(outer));
outer.identity.schemaVersion=2;
const outerRejectsV2=rejects(()=>parseEnvelope(JSON.stringify(outer)));
if(!v1RejectsV2||!outerRejectsV2)throw new Error('version boundary');
const result={kind:'offline-design-audit',base,head:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),
  runtimeTestsRun:false,nativeClaims:false,productionChanges:foreignChanges,
  coordinatorChangesExcluded:changed.includes('typescript/COORDINATION.md'),
  protectedTrackedFiles:tracked.filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md').length,
  manifestSha256:sha(read(manifestPath)),selectedFiles:manifest.entries.length,
  plannedVariantsPerLane:planned.length,blockedVariantsPerLane:planned.filter(v=>v.blockers.length).length,
  variantCounts:Object.fromEntries(['strict','non-strict','raw','module'].map(v=>[v,planned.filter(p=>p.variant===v).length])),
  v1ValidChildAccepted:true,v1ChildRejectsVersion2:v1RejectsV2,v1ValidOuterAccepted:true,v1OuterRejectsVersion2:outerRejectsV2,
  inspectedFiles:files.map(path=>({path,sha256:sha(read(path))})),planned};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({selectedFiles:result.selectedFiles,variants:planned.length,blocked:result.blockedVariantsPerLane,protected:result.protectedTrackedFiles,v1ChildRejectsV2:v1RejectsV2,v1OuterRejectsV2:outerRejectsV2}));
