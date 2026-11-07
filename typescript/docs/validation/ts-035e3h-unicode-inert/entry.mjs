const RUN = false;
if (!RUN) throw new Error('INERT: separate review and execution authorization required');
const fs=await import('node:fs'),{join}=await import('node:path');
const {createHash}=await import('node:crypto');
const hash=b=>createHash('sha256').update(b).digest('hex');
const planBytes=fs.readFileSync(join(import.meta.dirname,'bindings.json'));
if(hash(planBytes)!=='1078453d4fe1d1fb60b6cc532816f339177e008e451d32e8162b048ae63deb41')throw Error('bindings identity');
const plan=JSON.parse(planBytes);
if(process.execPath!==plan.node.path)throw Error('Node path identity');
for(const row of plan.rows){const b=fs.readFileSync(row.path);if(b.length!==row.bytes||hash(b)!==row.sha256)throw Error('bound source identity');}
const {readBound,run}=await import('./controller.mjs');
for(const row of plan.rows)readBound(row);
const contract=JSON.parse(readBound(plan.contract));
const expected={replacement:readBound(plan.replacement),preserved:readBound(plan.preserved)};
const {transport,clock}=await import('./transport.mjs');
try {const result=await run(contract,plan.rows,transport,clock,expected);process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.review.outcome==='stopped'?1:0;}
catch(e){process.stderr.write(JSON.stringify({outcome:'stopped',error:String(e),partialRootRetained:true,retry:false})+'\n');process.exitCode=1;}
