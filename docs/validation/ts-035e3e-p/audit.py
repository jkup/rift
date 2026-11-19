"""Read-only snapshot inventory. No compiler, guest, network, or build invocation."""
import hashlib, json, pathlib, re, subprocess
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REPO = ROOT.parent
def digest(b): return hashlib.sha256(b).hexdigest()
def save(name, value): (HERE/name).write_text(json.dumps(value, indent=2)+'\n', encoding='utf8')
def member(p, base=ROOT):
    b=p.read_bytes()
    return {'path':p.relative_to(base).as_posix(),'bytes':len(b),'sha256':digest(b)}
def tree(path): return sorted(p for p in path.rglob('*') if p.is_file())
paths=subprocess.check_output(['git','ls-files','-z'],cwd=REPO).decode().split('\0')
protected=[p for p in paths if p and p not in ['typescript/TASKS.md','typescript/COORDINATION.md'] and not p.startswith('typescript/docs/validation/ts-035e3e-p/') and p!='typescript/docs/script-execution-identity.md']
save('preservation.json',[member(REPO/p,REPO) for p in protected])
source=sorted(list((ROOT/'src').rglob('*.ts'))+[ROOT/'test/script-observation.ts'])
save('construction-source.json',[member(p) for p in source])
host=sorted(p for p in (ROOT/'tools').rglob('*.mjs'))
edges=[]
for p in source+host:
    text=p.read_text(encoding='utf8')
    imports=re.findall(r'(?:from\s*|import\s*\()\s*[\'"]([^\'"]+)',text)
    edges.append({'path':p.relative_to(ROOT).as_posix(),'imports':imports,'dynamicImportSyntax':bool(re.search(r'\bimport\s*\(',text))})
save('imports.json',edges)
groups={
 'source':[member(p) for p in source],
 'adapterAndTests':[member(p) for p in host],
 'configuration':[member(ROOT/p) for p in ['package.json','package-lock.json','tsconfig.json']],
 'fixtures':[member(p) for d in ['test/fixtures/harness-bundle','test/fixtures/script-observation'] for p in tree(ROOT/d)],
 'installedPackages':[member(p) for d in ['scriptc','@scriptc','typescript','@typescript','@types','undici-types','yaml'] for p in tree(ROOT/'node_modules'/d)],
}
save('closure-inventory.json',groups)
accepted=ROOT/'docs/validation/ts-035e3d'
names=['generated-closure.json','copied-inputs.json','complete-artifact-index.json','completion.json','run-location.json','prepare.mjs','run.mjs']
save('accepted-evidence.json',[member(accepted/p) for p in names])
data=json.loads((accepted/'generated-closure.json').read_text())
save('build-evidence-shape.json',{'generatedKeys':list(data),'generatedCounts':{k:len(v) for k,v in data.items() if isinstance(v,list)},'copiedShape':str(type(json.loads((accepted/'copied-inputs.json').read_text()))),'claim':'Retained accepted evidence only; no new build or source-to-binary certification.'})
print(json.dumps({'protected':len(protected),'groups':{k:len(v) for k,v in groups.items()},'importFiles':len(edges)}))
