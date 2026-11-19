import { readFixtureFileSync as readFileSync } from "../../../../tools/test262/test-support/fixture-files.mjs";
// Process wrapper for parent transport tests. It executes the actual prepared
// child first; it never evaluates guest source in Node.
import {spawnSync} from 'node:child_process';
import { writeFileSync, unlinkSync } from "node:fs";
if(process.argv[2]==='fixture'){
 const mode=process.argv[3],exe=process.argv[4],args=process.argv.slice(5),offset=args.indexOf('script-observation'),path=args[offset+5];
 const r=spawnSync(exe,args,{encoding:'buffer',timeout:10000,maxBuffer:2**22});
 if(r.error||r.signal||r.status!==0)process.exit(71);
 if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);
 if(mode==='stdout'){process.stdout.write(readFileSync(path));unlinkSync(path);}
 if(mode==='malformed')writeFileSync(path,'{}');
 if(mode==='exit70')process.exitCode=70;
 if(mode==='cap'||mode==='crashcap'){process.stdout.write('x'.repeat(16384));process.stderr.write('y'.repeat(16384));if(mode==='crashcap')process.exitCode=70;else setInterval(()=>{},1000);}
}
