import { createHash } from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';
import { parseDocument } from 'yaml';

// Closed v2 boundary. These private predicates are also retained in the full
// envelope boundary: neither module imports or widens the historical v1 API.
const integer = x => Number.isSafeInteger(x) && x >= 0;
const str = x => typeof x === 'string' && x.length > 0;
const id = x => str(x) && /^[\x21-\x7e]+$/.test(x);
const bool = x => typeof x === 'boolean';
const one = values => x => values.includes(x);
const nullable = check => x => x === null || check(x);
const array = check => x => Array.isArray(x) && x.every(check);
const hash = n => x => typeof x === 'string' && new RegExp(`^[a-f0-9]{${n}}$`).test(x);
const sha = hash(64);
const path = x => str(x) && /^(test|harness)\//.test(x) && x.endsWith('.js') &&
  !/[\\:\0]/.test(x) && x.split('/').every(p => p && p !== '.' && p !== '..');
function record(x, fields) {
  return x !== null && typeof x === 'object' && !Array.isArray(x) &&
    Object.keys(x).length === Object.keys(fields).length &&
    Object.entries(fields).every(([k, check]) => Object.hasOwn(x,k) && check(x[k]));
}
const need = condition => { if (!condition) throw new Error('protocol'); };
const digest = x => createHash('sha256').update(x).digest('hex');
const modes = one(['script-observation','conformance']);
const variants = one(['strict','non-strict','raw']);
const guards = {'source-units':'sourceUnits','parse-depth':'parseDepth',steps:'steps',calls:'calls','evaluation-depth':'evaluationDepth'};
const syntaxCodes = ['lex.indeterminate-comment','lex.leading-zero','lex.numeric-literal',
  'lex.indeterminate-string-newline','lex.string-escape','lex.indeterminate-string-end','lex.operator','lex.character',
  'parse.expected-token','parse.binding-identifier','parse.duplicate-binding','parse.declaration-statement',
  'parse.return-context','parse.line-terminator','parse.throw-expression','parse.loop-context','parse.duplicate-parameter',
  'parse.property-name','parse.assignment-target','parse.delete-identifier','parse.array-spread','parse.object-key',
  'parse.prototype-literal','parse.unexpected','script.uncertified-conflict'];
const runtimeCodes = ['runtime.object-to-number','runtime.object-to-string','runtime.map-species'];
const limitsShape = x => record(x,Object.fromEntries(['sourceUnits','parseDepth','steps','calls','evaluationDepth','wallMs','outputBytes'].map(k=>[k,integer])));
const unitShape = x => record(x,{id,ordinal:integer,role:one(['harness','test']),path,blob:hash(40),sourceSha256:sha,transformedSha256:sha,byteLength:integer,sourceUnits:integer});
const realmShape = x => record(x,{id,profile:one(['script'])});
const operationShape = x => record(x,{stage:one(['harness','test']),phase:one(['parse','instantiation','body']),unitId:id,realmId:id});
const siteShape = x => record(x,{unitId:id,realmId:id,location:y=>record(y,{line:n=>integer(n)&&n>0,column:n=>integer(n)&&n>0})});
const originalShape = x => record(x,{valueKind:one(['undefined','null','boolean','number','string','symbol','object']),origin:one(['guest','engine-diagnostic']),site:siteShape});
const inspectionShape = nullable(x=>record(x,{original:originalShape,operation:operationShape}));

function bindingState(b) {
  need(record(b,{nonce:id,requestSha256:sha,mode:modes,variant:variants,units:array(unitShape),realms:array(realmShape),
    preflightId:nullable(id),action:one(['parse-only','execute']),limits:limitsShape,
    sources:array(x=>record(x,{unitId:id,transformedText:x=>typeof x==='string'}))}));
  need(b.limits.sourceUnits===100000 && b.limits.parseDepth===128 && b.limits.evaluationDepth===256 && b.limits.wallMs<=2147483647);
  need(b.units.length>0 && b.realms.length>0 && new Set(b.realms.map(r=>r.id)).size===b.realms.length);
  need(b.units.every((u,n)=>u.id==='u'+n && u.ordinal===n && u.role===(n===b.units.length-1?'test':'harness') && u.path.startsWith(u.role+'/')));
  need(b.variant!=='raw' || (b.units.length===1 && b.preflightId===null));
  need(b.sources.length===b.units.length && b.sources.every((s,n)=>s.unitId===b.units[n].id &&
    s.transformedText.length===b.units[n].sourceUnits && digest(Buffer.from(s.transformedText,'utf8'))===b.units[n].transformedSha256 &&
    new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.from(s.transformedText,'utf8'))===s.transformedText));
  // Canonical field order is part of request identity, independent of callers'
  // object property insertion order. No expected result enters this hash.
  const units=b.units.map(u=>({id:u.id,ordinal:u.ordinal,role:u.role,path:u.path,blob:u.blob,sourceSha256:u.sourceSha256,
    transformedSha256:u.transformedSha256,byteLength:u.byteLength,sourceUnits:u.sourceUnits}));
  const realms=b.realms.map(r=>({id:r.id,profile:r.profile}));
  const limits=Object.fromEntries(['sourceUnits','parseDepth','steps','calls','evaluationDepth','wallMs','outputBytes'].map(k=>[k,b.limits[k]]));
  need(digest(JSON.stringify({requestVersion:2,nonce:b.nonce,mode:b.mode,variant:b.variant,units,realms,limits,preflightId:b.preflightId,action:b.action}))===b.requestSha256);
  return {units:new Map(b.units.map(u=>[u.id,u])),realms:new Set(b.realms.map(r=>r.id)),sources:new Map(b.sources.map(s=>[s.unitId,s.transformedText]))};
}
function constructorShape(c) {
  if (!record(c,{outcome:one(['available','absent','non-callable','non-string-name','foreign-profile','unregistered-realm','abrupt']),
    name:nullable(x=>typeof x==='string'),realmId:nullable(id),secondary:nullable(originalShape)})) return false;
  if (c.outcome==='available') return typeof c.name==='string' && c.realmId!==null && c.secondary===null;
  if (c.outcome==='non-string-name') return c.name===null && c.realmId!==null && c.secondary===null;
  return c.name===null && c.realmId===null && (c.outcome==='abrupt'?c.secondary!==null:c.secondary===null);
}
function resultShape(x,parent=false) {
  if (x===null || typeof x!=='object') return false;
  const fields={normal:{},throw:{phase:one(['runtime']),original:originalShape,constructor:constructorShape},
    'syntax-error':{phase:one(['parse']),constructorName:one(['SyntaxError']),ruleCode:one(['return-outside-function'])},
    'unsupported-syntax':{capabilityCode:one(syntaxCodes)},
    'unsupported-operation':{phase:one(['runtime']),capabilityCode:one(runtimeCodes)},
    'unsupported-profile':{reasonCode:one(['strict','realm'])},
    'resource-limit':{guardCode:one([...Object.keys(guards),...(parent?['output']:[])]),count:integer,limit:integer},
    ...(parent?{timeout:{wallMs:integer},'host-fault':{faultCode:str},'not-run':{reasonCode:str}}:{})};
  if (!Object.hasOwn(fields,x.kind)) return false;
  const shape={kind:one([x.kind]),...fields[x.kind]};
  if (x.kind!=='normal' && Object.hasOwn(x,'diagnostic')) shape.diagnostic=str;
  if (!record(x,shape)) return false;
  if (x.kind==='throw' && x.original.valueKind!=='object' && x.constructor.outcome!=='absent') return false;
  return x.kind!=='resource-limit' || (x.guardCode==='calls'?x.count>=x.limit:x.count>x.limit);
}
function checkOperation(v,b,s) {
  const op=v.operation, o=v.result;
  need(operationShape(op) && nullable(siteShape)(v.source) && bool(v.testBodyEvaluated) && bool(v.harnessValidated) &&
    nullable(id)(v.preflightId) && array(id)(v.completedUnits) && inspectionShape(v.inspection) && resultShape(o));
  const u=s.units.get(op.unitId);
  need(u && u.role===op.stage && s.realms.has(op.realmId));
  need(v.preflightId===b.preflightId && (!v.harnessValidated || b.preflightId!==null));
  need(b.variant!=='raw' || (!v.harnessValidated && v.completedUnits.length===0 && v.preflightId===null));
  if (op.stage==='test' && b.mode==='conformance' && b.variant!=='raw') need(v.harnessValidated && b.preflightId!==null);
  need(v.testBodyEvaluated===(op.stage==='test' && op.phase==='body'));
  if (b.action==='parse-only') need(op.stage!=='test' || op.phase==='parse');
  // Current harness occurrence joins the prefix only after successful body
  // evaluation; merely parsing it is never completion evidence.
  const completed=u.ordinal+(op.stage==='harness' && op.phase==='body' && o.kind==='normal'?1:0);
  need(equal(v.completedUnits,b.units.slice(0,completed).map(u=>u.id)));
  function site(site) {
    need(siteShape(site) && s.realms.has(site.realmId));
    const unit=s.units.get(site.unitId);
    need(unit && unit.ordinal<=u.ordinal);
    const lines=s.sources.get(site.unitId).split(/\r\n|[\r\n\u2028\u2029]/);
    need(site.location.line<=lines.length && site.location.column<=lines[site.location.line-1].length+1);
  }
  if (o.kind==='normal') need(v.source===null && v.inspection===null && op.phase!=='instantiation');
  else { need(v.source!==null); site(v.source); }
  if (op.phase==='parse') {
    need(v.inspection===null && !['throw','unsupported-operation'].includes(o.kind));
    if (v.source) need(v.source.unitId===op.unitId && v.source.realmId===op.realmId);
  }
  if (['syntax-error','unsupported-syntax','unsupported-profile'].includes(o.kind)) need(op.phase==='parse');
  if (o.kind==='throw') {
    need(op.phase!=='parse' && v.inspection===null && equal(v.source,o.original.site));
    site(o.original.site);
    if (o.constructor.realmId!==null) need(s.realms.has(o.constructor.realmId));
    if (o.constructor.secondary!==null) site(o.constructor.secondary.site);
  }
  if (o.kind==='unsupported-operation') need(op.phase!=='parse');
  if (o.kind==='resource-limit') {
    need(o.limit===b.limits[guards[o.guardCode]]);
    need(['source-units','parse-depth'].includes(o.guardCode)===(op.phase==='parse'));
  }
  if (v.inspection!==null) {
    need(b.action==='execute' && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));
    need(v.inspection.original.valueKind==='object' && equal(v.inspection.operation,op));
    site(v.inspection.original.site);
  }
}
function decode(json) {
  if (Buffer.isBuffer(json)) {
    need(json.length<=65536);
    json=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(json);
  }
  need(typeof json==='string' && Buffer.byteLength(json,'utf8')<=65536);
  const value=JSON.parse(json);
  const doc=parseDocument(json,{uniqueKeys:true,schema:'json',strict:true});
  need(doc.errors.length===0 && doc.warnings.length===0);
  return value;
}

const processShape = x=>record(x,{exitCode:nullable(Number.isSafeInteger),signal:nullable(str),deadlineExpired:bool}) && !(x.exitCode!==null && x.signal!==null);
const identityShape = x=>record(x,{schemaVersion:one([2]),runId:str,mode:modes,corpusRevision:nullable(hash(40)),manifestSha256:nullable(sha),
  path:nullable(path),blob:nullable(hash(40)),sourceSha256:nullable(sha),variant:variants,goal:one(['Script']),lane:one(['node','native']),
  engineCommit:nullable(hash(40)),engineBuildSha256:nullable(sha),adapterSha256:nullable(sha),policySha256:nullable(sha),dirtySourceSha256:nullable(sha)});
const inputsShape = x=>record(x,{units:array(unitShape),transformedSourceSha256:nullable(sha),profileId:nullable(str),capabilityLedgerSha256:nullable(sha),
  host:nullable(str),platform:nullable(str),toolchain:nullable(str),limits:x=>record(x,Object.fromEntries(['sourceUnits','parseDepth','steps','calls','evaluationDepth','wallMs','outputBytes'].map(k=>[k,nullable(integer)]))),
  requestSha256:nullable(sha),preflightId:nullable(id),realms:array(realmShape),ruleRegistrySha256:nullable(sha)});
const negativeShape = nullable(x=>record(x,{phase:one(['parse','runtime']),type:str}));
const blockerShape = x=>record(x,{status:one(['unsupported-feature','unsupported-profile']),reasonCode:str});
const evidenceShape = x=>record(x,{stage:one(['input','preflight','harness','test','driver']),operation:nullable(operationShape),source:nullable(siteShape),
  testBodyEvaluated:bool,harnessValidated:bool,preflightId:nullable(id),completedUnits:array(id),inspection:inspectionShape,
  process:processShape,stdoutSha256:nullable(sha),stderrSha256:nullable(sha),elapsedMs:nullable(x=>Number.isFinite(x)&&x>=0)});
const classificationShape = x=>record(x,{status:one(['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault']),
  reasonCode:str,blockers:array(blockerShape),expectedNegative:negativeShape,observedPhase:nullable(one(['parse','runtime'])),observedConstructorName:nullable(x=>typeof x==='string')});
const idle = e=>e.operation===null && e.source===null && e.inspection===null && !e.testBodyEvaluated && !e.harnessValidated && e.completedUnits.length===0;

function checkCore(v,b) {
  need(record(v,{identity:identityShape,inputs:inputsShape,evidence:evidenceShape,observation:x=>resultShape(x,true),
    ...(v?.identity?.mode==='conformance'?{classification:classificationShape}:{})}));
  const {identity:i,inputs:n,evidence:e,observation:o}=v;
  if (v.classification?.expectedNegative?.phase==='parse' && e.stage==='test') need(!e.testBodyEvaluated && (e.operation===null || e.operation.phase==='parse'));
  need(i.mode!=='script-observation' || n.capabilityLedgerSha256===null);
  need(e.preflightId===n.preflightId);
  need(i.variant!=='raw' || (n.units.every(u=>u.role==='test') && e.completedUnits.length===0 && n.preflightId===null && !e.harnessValidated));
  if (b===null) {
    need(o.kind==='not-run' && ['input','preflight'].includes(e.stage) && idle(e) && e.process.exitCode===null && e.process.signal===null && !e.process.deadlineExpired);
    return;
  }
  const state=bindingState(b);
  need(b.mode===i.mode && b.variant===i.variant && b.requestSha256===n.requestSha256 && b.preflightId===n.preflightId &&
    equal(b.units,n.units) && equal(b.realms,n.realms) && equal(b.limits,n.limits));
  const test=b.units[b.units.length-1];
  need(i.path===test.path && i.blob===test.blob && i.sourceSha256===test.sourceSha256 && n.transformedSourceSha256===test.transformedSha256);
  const parentOnly=['timeout','host-fault','not-run'].includes(o.kind) || (o.kind==='resource-limit' && o.guardCode==='output');
  if (parentOnly) {
    need(idle(e));
    if (o.kind==='not-run') need(['input','preflight'].includes(e.stage) && e.process.exitCode===null && e.process.signal===null && !e.process.deadlineExpired);
    else need(['driver','harness'].includes(e.stage));
    if (o.kind==='timeout') need(o.wallMs===b.limits.wallMs);
    if (o.kind==='resource-limit') need(o.limit===b.limits.outputBytes);
  } else {
    need(e.operation!==null && e.stage===e.operation.stage);
    checkOperation({...e,result:o},b,state);
  }
}
function complete(v) {
  const {identity:i,inputs:n,evidence:e}=v;
  return Object.entries(i).every(([k,x])=>k==='dirtySourceSha256'||x!==null) &&
    ['transformedSourceSha256','profileId','capabilityLedgerSha256','host','platform','toolchain','requestSha256','ruleRegistrySha256'].every(k=>n[k]!==null) &&
    Object.values(n.limits).every(x=>x!==null) && e.stdoutSha256!==null && e.stderrSha256!==null && e.elapsedMs!==null;
}
function classification(v) {
  const {evidence:e,observation:o,classification:c}=v;
  const negative=c.expectedNegative, blockers=c.blockers;
  const answer=(status,reasonCode)=>({status,reasonCode,blockers,expectedNegative:negative,
    observedPhase:['throw','syntax-error','unsupported-operation'].includes(o.kind)?o.phase:null,
    observedConstructorName:o.kind==='throw'?o.constructor.name:o.kind==='syntax-error'?'SyntaxError':null});
  if (e.process.deadlineExpired || o.kind==='timeout') return answer('timeout','deadline');
  // Output termination can retain a killed process. This structural derivation
  // is authenticated only by inspectScriptEnvelope's separate parent facts.
  if ((e.process.signal!==null || (e.process.exitCode!==null && e.process.exitCode!==0)) && !(o.kind==='resource-limit'&&o.guardCode==='output')) return answer('host-fault','crash');
  if (o.kind==='host-fault') return answer('host-fault',o.faultCode);
  if (o.kind==='resource-limit') return answer('resource-limit',o.guardCode);
  if (['unsupported-syntax','unsupported-operation'].includes(o.kind)) return answer('unsupported-feature',o.capabilityCode);
  if (o.kind==='unsupported-profile') return answer('unsupported-profile',o.reasonCode);
  if (o.kind==='not-run') {
    if (blockers.length) { need(o.reasonCode===blockers[0].reasonCode); return answer(blockers[0].status,blockers[0].reasonCode); }
    return answer('harness-error',o.reasonCode);
  }
  if (o.kind==='throw' && ['foreign-profile','unregistered-realm'].includes(o.constructor.outcome)) return answer('unsupported-feature','constructor.'+o.constructor.outcome);
  if (e.process.exitCode!==0) return answer('host-fault','protocol');
  if (e.stage==='harness') return answer('harness-error','harness');
  if (blockers.length || e.stage!=='test' || !complete(v)) return answer('host-fault','protocol');
  if (o.kind==='normal' && !e.testBodyEvaluated && negative?.phase!=='parse') return answer('host-fault','protocol');
  if (!negative) return o.kind==='normal'?answer('pass','normal'):answer('fail',o.kind==='throw'?'uncaught-throw':'unexpected-parse-error');
  if (o.kind==='normal') return answer('fail',negative.phase==='parse'?'expected-parse-error':'expected-throw');
  if (o.phase!==negative.phase) return answer('fail','phase-mismatch');
  if (o.kind==='throw' && o.constructor.outcome==='abrupt') return answer('fail','constructor-inspection-abrupt');
  const name=o.kind==='throw'?o.constructor.name:o.constructorName;
  return name===negative.type?answer('pass','negative-match'):answer('fail','type-mismatch');
}
export function validateScriptRecord(value,binding) {
  checkCore(value,binding);
  if (value.identity.mode==='conformance') need(equal(value.classification,classification(value)));
  return value;
}
export function parseScriptEnvelope(json,binding) {
  return validateScriptRecord(decode(json),binding);
}
export function assertScriptContext(value,context,binding) {
  need(record(context,{identity:identityShape,inputs:inputsShape,expectedNegative:negativeShape,blockers:array(blockerShape)}));
  validateScriptRecord(value,binding);
  need(equal(value.identity,context.identity) && equal(value.inputs,context.inputs));
  if (value.identity.mode==='conformance') need(equal(value.classification.expectedNegative,context.expectedNegative) && equal(value.classification.blockers,context.blockers));
  return value;
}
export function inspectScriptEnvelope(json,context,transport,binding) {
  need(record(transport,{process:processShape,outputBytes:integer,outputLimit:integer,capCount:nullable(integer),capKilled:bool,crashBeforeCap:bool}));
  need(transport.capCount===null || (transport.capCount>transport.outputLimit && transport.capCount<=transport.outputBytes));
  need(!transport.capKilled || transport.capCount!==null);
  const fault=(status,reasonCode)=>({status,reasonCode});
  const p=transport.process;
  function override(status,reasonCode,matches) {
    try {
      const v=assertScriptContext(parseScriptEnvelope(json,binding),context,binding);
      need(equal(v.evidence.process,p) && (context.inputs.limits.outputBytes===null || transport.outputLimit===context.inputs.limits.outputBytes) && matches(v.observation));
      return v;
    } catch { return fault(status,reasonCode); }
  }
  if (p.deadlineExpired) return override('timeout','deadline',o=>o.kind==='timeout');
  if (transport.crashBeforeCap || (!transport.capKilled && (p.signal!==null || (p.exitCode!==null&&p.exitCode!==0)))) return override('host-fault','crash',o=>o.kind==='host-fault'&&o.faultCode==='crash');
  if (transport.outputBytes>transport.outputLimit) {
    // Return a valid authenticated cap envelope when available. Otherwise the
    // parent output fact still overrides malformed or missing protocol bytes.
    try {
      const v=assertScriptContext(parseScriptEnvelope(json,binding),context,binding);
      need(equal(v.evidence.process,p) && (context.inputs.limits.outputBytes===null || transport.outputLimit===context.inputs.limits.outputBytes));
      need(v.observation.kind==='resource-limit' && v.observation.guardCode==='output' && v.observation.count===transport.capCount);
      return v;
    } catch { return fault('resource-limit','output'); }
  }
  try {
    const v=assertScriptContext(parseScriptEnvelope(json,binding),context,binding);
    need(equal(v.evidence.process,p) && (context.inputs.limits.outputBytes===null || transport.outputLimit===context.inputs.limits.outputBytes));
    need(p.exitCode!==null || ['not-run','host-fault'].includes(v.observation.kind));
    need(v.observation.kind!=='timeout' && !(v.observation.kind==='resource-limit'&&v.observation.guardCode==='output'));
    return v;
  } catch { return fault('host-fault','protocol'); }
}
