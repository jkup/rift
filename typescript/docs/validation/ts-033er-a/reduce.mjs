import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const compiler = join(root, 'node_modules/scriptc/bin/scriptc.exe');
function run(command, args) {
    const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
    return { status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr };
}
const results = [];
for (const name of ['override-before', 'override-after']) {
    const source = `docs/validation/ts-033er-a/${name}.ts`;
    const output = join(root, 'build/native', name + '.exe');
    const build = run(compiler, ['build', source, '--tier', 'static-only', '-o', output]);
    const coverage = run(compiler, ['coverage', source]);
    const native = build.status === 0 ? run(output, []) : null;
    results.push({ name, build, coverage, native });
}
writeFileSync(new URL('reduction-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results.map(r => ({ name: r.name, build: r.build.status, native: r.native?.stdout ?? null }))));
if (results[0].build.status === 0 || !results[0].build.stderr.includes('SC1090') || results[1].build.status !== 0 || results[1].native.status !== 0 || results[1].native.stdout.trim() !== '7') process.exitCode = 1;
