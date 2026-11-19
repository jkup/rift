import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const prettierPath = process.argv[2];
if (!prettierPath) { throw Error('Pass the installed prettier module path'); }
const prettier = await import(pathToFileURL(prettierPath).href);
const directory = 'docs/validation/ts-027a/readability/';
const baseline = execFileSync('git', ['show', '987d83b:typescript/test/in-operator.ts'], {encoding: 'utf8'});
const current = fs.readFileSync('test/in-operator.ts', 'utf8');
const edits = JSON.parse(fs.readFileSync(directory + 'selection-edits.json', 'utf8'));
let restored = current;
for (const edit of edits) {
    assert.equal(restored.split(edit.after).length, 2, 'exactly one occurrence: ' + edit.name);
    restored = restored.replace(edit.after, edit.before);
    assert(!/\b(check|expect|error)\s*\(/.test(edit.before + edit.after), 'assertions must remain outside selection edits');
}
const options = {parser: 'typescript', tabWidth: 4, printWidth: 100};
assert.equal(await prettier.format(restored, options), await prettier.format(baseline, options),
    'all content outside four exact selection edits must be formatting-only');
// Tokenize comments and literals before extracting strings, so guest source
// text and embedded semicolons/whitespace stay intact rather than normalized.
function strings(source) {
    const tokens = source.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\s+|./g) ?? [];
    return tokens.filter(token => token.startsWith('"') || token.startsWith("'")).sort();
}
assert.deepEqual(strings(current), strings(baseline), 'every string literal and multiplicity preserved');
const report = {
    baseline: '987d83b',
    driver: 'test/in-operator.ts',
    formatter: prettier.version,
    formattingOnlyOutsideSelections: true,
    exactSelectionEdits: edits.map(edit => edit.name),
    stringLiteralOccurrencesPreserved: strings(baseline).length,
    assertionsUnchanged: true,
    productionChanges: execFileSync('git', ['diff', '987d83b', '--', 'src/'], {encoding: 'utf8'}),
};
assert.equal(report.productionChanges, '');
fs.writeFileSync(directory + 'source-preservation.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
