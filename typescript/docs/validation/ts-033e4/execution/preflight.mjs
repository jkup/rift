import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
    return { command, args, status: result.status, signal: result.signal, error: result.error?.message ?? null, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
const compiler = root + 'node_modules/scriptc/bin/scriptc.exe';
const rows = { typecheck: run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']) };
if (rows.typecheck.status === 0) {
    rows.build = run(compiler, ['build', 'test/script-execution.ts', '--tier', 'static-only', '-o', 'build/e4-preflight.exe']);
    rows.coverage = run(compiler, ['coverage', 'test/script-execution.ts', '--explain-dynamic']);
    for (const input of ['seed', 'other']) {
        rows[input] = { node: run(process.execPath, ['build/node/test/script-execution.js', 'fixtures/script-execution/' + input + '.txt']) };
        if (rows.build.status === 0) rows[input].native = run(root + 'build/e4-preflight.exe', ['fixtures/script-execution/' + input + '.txt']);
    }
}
let sequence = 1;
while (existsSync(new URL(`preflight-${sequence}.json`, import.meta.url))) sequence++;
writeFileSync(new URL(`preflight-${sequence}.json`, import.meta.url), JSON.stringify(rows, null, 2) + '\n');
console.log(JSON.stringify(rows, null, 2));
