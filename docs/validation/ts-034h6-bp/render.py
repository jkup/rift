"""Render review-only copies. Never writes to src/ or test/."""
from pathlib import Path
import hashlib, json, re, subprocess, difflib, io, tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REPO = ROOT.parent
BASE = 'c8bd4bb5b525bf061eef19141831f0ca79142d6f'
def digest(b): return hashlib.sha256(b).hexdigest()
def put(path, data):
    p = HERE / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data if isinstance(data, bytes) else data.encode())
def js(path, data): put(path, json.dumps(data, indent=2) + '\n')
def mask(s):
    # Preserve offsets/newlines; exclude comments and literal text from API discovery.
    return re.sub(r'//[^\r\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`', lambda m: re.sub(r'[^\r\n]', ' ', m[0]), s)
helpers = 'toNumber toString toUint32 toIntegerOrInfinity toLength thisNumberValue thisStringValue thisBooleanValue thisSymbolValue'.split()
table = {
 'array-like.ts':[121,122,134,135], 'array-string-conversion.ts':[655],
 'boolean-string-conversions.ts':[111,168,181,229], 'conversion.ts':[23,24,34,114,126,130],
 'function-string-conversion.ts':[470], 'key-coercion.ts':[210], 'number-conversions.ts':[106,131,213],
 'length-coercion.ts':[314,315,317,318,339,340,341,342], 'object-valueof.ts':[238,293],
 'primitive-conversion.ts':[285], 'primitive-reads.ts':[787], 'property-assignment.ts':[1056],
 'property-key-conversion.ts':[98,115,299], 'realms.ts':[359], 'structured-outcomes.ts':[227],
 'symbol-conversions.ts':[110,128,191]}
globals_table = {'global-environment.ts':([99,138,166,246,264,279,329,354,355],'null'),
 'script-environment.ts':([81],'context.realm'), 'script-realm-bootstrap.ts':([112,166],'context.realm'),
 'harness-nonstrict.ts':([591],'c.realm'), 'script-global-declarations.ts':([176,258],'h.context.realm')}
edits = {}
def edit(file, start, end, new, reason):
    raw = (ROOT/'test'/file).read_bytes()
    edits.setdefault(file, []).append(dict(start=start,end=end,old=raw[start:end].decode(),new=new,reason=reason))
def replace(file, old, new, reason):
    raw=(ROOT/'test'/file).read_bytes(); old=old.replace('\n','\r\n') if b'\r\n' in raw else old
    new=new.replace('\n','\r\n') if b'\r\n' in raw else new
    needle=old.encode(); assert raw.count(needle)==1, (file, old[:100], raw.count(needle))
    start=raw.index(needle); edit(file,start,start+len(needle),new,reason)
def append(file, lines, names, argument):
    raw=(ROOT/'test'/file).read_bytes(); s=raw.decode(); m=mask(s); found=set()
    for match in re.finditer(r'\b('+'|'.join(names)+r')\s*\(',m):
        line=s.count('\n',0,match.start())+1
        if line not in lines: continue
        start=match.end(); depth=1; end=start
        while depth:
            if m[end]=='(': depth+=1
            elif m[end]==')': depth-=1
            end+=1
        pos=len(s[:end-1].encode())
        edit(file,pos,pos,', '+argument,'Mandatory trailing Realm; preserve existing null compatibility or running Script context.')
        found.add(line)
    assert found==set(lines),(file,found,set(lines))
for f, lines in table.items(): append(f, lines, helpers, 'null')
for f,(lines,arg) in globals_table.items(): append(f,lines,['createMutableBinding'],arg)
replace('script-global-declarations.ts',
 'override createMutableBinding(n: string, loc: Location): ValueCompletion { return this.visit("L+:" + n) ? this.abrupt : super.createMutableBinding(n, loc); }',
 'override createMutableBinding(n: string, loc: Location, realm: Realm | null): ValueCompletion { return this.visit("L+:" + n) ? this.abrupt : super.createMutableBinding(n, loc, realm); }',
 'Forward mandatory Realm unchanged; visit and exact abrupt remain in same order.')
replace('script-realm-bootstrap.ts',
 'const globals=["undefined","NaN","Infinity","console","Number"];',
 'const legacyGlobals=["undefined","NaN","Infinity","console","Number"];\n    const globals=[...legacyGlobals,"Error","TypeError","ReferenceError","RangeError","SyntaxError"];',
 'Separate original exact legacy inventory from ten Script globals; B02 descriptor loop remains intact.')
replace('script-realm-bootstrap.ts','check(key===globals[i] && binding.initialized','check(key===legacyGlobals[i] && binding.initialized','B01 continues asserting original five legacy globals and count.')

replace('harness-errors-a.ts','check(keysEqual(p, ["name", "message"]), "prototype keys");',
 'check(keysEqual(p, name === "Error" ? ["name", "message", "constructor", "toString"] : ["name", "message", "constructor"]), "complete prototype keys");',
 'A03 exact keys strengthen to completed B graph; retain existing name/message descriptor checks.')
replace('harness-errors-a.ts',
 'check(p !== q && !protos.includes(p) && !(p instanceof GuestError) && !(q instanceof GuestError), "distinct ordinary prototypes"); protos.push(p);',
 'check(p !== q && !protos.includes(p) && !(p instanceof GuestError) && !(q instanceof GuestError), "distinct ordinary prototypes"); protos.push(p);\n        check(a.getErrorConstructor(name) !== b.getErrorConstructor(name), "distinct Realm constructors");',
 'A02 retains every original identity and prototype assertion and adds cross-Realm constructor separation.')
replace('harness-errors-a.ts',
 'check(p.getOwnProperty("constructor") === undefined && p.getOwnProperty("toString") === undefined, "A graph incomplete internally");\n        check(r.globalObject.getOwnProperty(name) === undefined, "no Error globals");',
 '''const ctor = r.getErrorConstructor(name), link = p.getOwnProperty("constructor");
        check(link !== undefined && link.kind === "data" && link.value.kind === "object" && link.value.object === ctor && link.writable && !link.enumerable && link.configurable, "prototype constructor identity/flags");
        check(keysEqual(ctor, ["name", "length", "prototype"]), "constructor keys");
        const cp = ctor.getOwnProperty("prototype"), cn = ctor.getOwnProperty("name"), cl = ctor.getOwnProperty("length");
        check(cp !== undefined && cp.kind === "data" && cp.value.kind === "object" && cp.value.object === p && !cp.writable && !cp.enumerable && !cp.configurable, "constructor prototype identity/flags");
        check(cn !== undefined && cn.kind === "data" && sameValue(cn.value, string(name)) && !cn.writable && !cn.enumerable && cn.configurable, "constructor name");
        check(cl !== undefined && cl.kind === "data" && sameValue(cl.value, { kind: "number", value: 1 }) && !cl.writable && !cl.enumerable && cl.configurable, "constructor length");
        check(ctor.getPrototypeOf() === (name === "Error" ? r.functionPrototype : r.getErrorConstructor("Error")) && ctor.callable !== null && ctor.callable.realm === r && ctor.constructorSlot !== null, "constructor graph/call/construct");
        const format = p.getOwnProperty("toString");
        if (name === "Error") {
            check(format !== undefined && format.kind === "data" && format.value.kind === "object" && format.writable && !format.enumerable && format.configurable, "Error toString descriptor");
            if (format === undefined || format.kind !== "data" || format.value.kind !== "object") throw new Error("format object");
            const method = format.value.object, mn = method.getOwnProperty("name"), ml = method.getOwnProperty("length");
            check(keysEqual(method, ["name", "length"]) && method.getPrototypeOf() === r.functionPrototype && method.callable !== null && method.callable.realm === r && method.constructorSlot === null, "format metadata/owner/nonconstructor");
            check(mn !== undefined && mn.kind === "data" && sameValue(mn.value, string("toString")) && !mn.writable && !mn.enumerable && mn.configurable, "format name");
            check(ml !== undefined && ml.kind === "data" && sameValue(ml.value, { kind: "number", value: 0 }) && !ml.writable && !ml.enumerable && ml.configurable, "format length");
        } else check(format === undefined, "NativeError inherits formatting");
        const global = r.globalObject.getOwnProperty(name);
        check(global !== undefined && global.kind === "data" && global.value.kind === "object" && global.value.object === ctor && global.writable && !global.enumerable && global.configurable, "Error global identity/flags");''',
 'Replace absence with exact identity, graph, descriptors, metadata and nonconstructible formatting. Proposal requires actual and independent review.')
replace('harness-errors-a.ts',
 'check(keysEqual(r.globalObject, ["undefined", "NaN", "Infinity", "console", "Number"]), "original globals");',
 'check(keysEqual(r.globalObject, ["undefined", "NaN", "Infinity", "console", "Number", "Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError"]), "exact B globals");',
 'Exact append-only Script global keys; legacy exact-five check remains unchanged in A09.')
replace('harness-errors-a.ts',
 'const c = run("missing;", r); check(c.type === "throw" && c.value.kind === "string" && c.diagnostic.name === "ReferenceError", "no failure migration");',
 '''const session = createScriptSession(), c = run("missing;", r, session, "A09-B");
    if (c.type !== "throw" || c.value.kind !== "object") throw new Error("genuine missing ReferenceError");
    const e = c.value.object, abrupt = session.inspect().lastAbrupt;
    check(e instanceof GuestError && e.getPrototypeOf() === r.getErrorPrototype("ReferenceError") && keysEqual(e, ["message"]), "originating error brand/prototype/keys");
    descriptor(e, "message", "missing is not defined");
    check(c.diagnostic.name === "ReferenceError" && c.diagnostic.message === "missing is not defined" && c.diagnostic.loc.line === 1 && c.diagnostic.loc.column === 1 && c.origin.kind === "engine-diagnostic", "unchanged diagnostic/location/origin");
    check(session.inspect().steps === 2 && abrupt !== null && abrupt.realm === r && abrupt.unitId === "A09-B" && abrupt.loc.line === 1 && abrupt.loc.column === 1, "zero allocation ticks/provenance");
    const next = run("missing;", r);
    check(next.type === "throw" && next.value.kind === "object" && next.value.object !== e && next.value.object instanceof GuestError && next.value.object.getPrototypeOf() === r.getErrorPrototype("ReferenceError"), "fresh engine failures");
    const synthetic = failure("ReferenceError", "missing is not defined", loc);
    check(synthetic.value.kind === "string" && synthetic.value.value === "ReferenceError: missing is not defined", "synthetic diagnostic compatibility");''',
 'A09 now proves genuine originating ReferenceError while retaining exact diagnostic, zero allocation ticks, freshness, source, cleanup and synthetic compatibility; all legacy host misuse checks untouched.')

manifest=[]; patches=[]
for file, replacements in sorted(edits.items()):
    old=(ROOT/'test'/file).read_bytes(); new=old
    replacements.sort(key=lambda e:e['start'])
    assert all(a['end']<=b['start'] for a,b in zip(replacements,replacements[1:])), file
    for e in reversed(replacements):
        assert old[e['start']:e['end']]==e['old'].encode()
        new=new[:e['start']]+e['new'].encode()+new[e['end']:]
    put('proposed/test/'+file,new)
    manifest.append(dict(path='typescript/test/'+file,beforeSha256=digest(old),afterSha256=digest(new),replacements=replacements))
    patches.extend(difflib.unified_diff(old.decode().splitlines(True),new.decode().splitlines(True),fromfile='a/typescript/test/'+file,tofile='b/typescript/test/'+file))
js('replacement-manifest.json',dict(base=BASE,status='UNAPPLIED; REVIEW REQUIRED',files=manifest))
put('proposed.patch',''.join(patches))

# Snapshot every tracked baseline byte, excluding only coordinator/task-owned status.
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=REPO,text=True).splitlines()
protected=[]
archive=tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git','archive',BASE],cwd=REPO)),mode='r:')
for path in paths:
    if path in ['typescript/TASKS.md','typescript/COORDINATION.md']: continue
    data=(REPO/path).read_bytes()
    baseline=archive.extractfile(path).read()
    assert data==baseline or (b'\0' not in data and data.replace(b'\r\n',b'\n')==baseline.replace(b'\r\n',b'\n')), path
    protected.append(dict(path=path,sha256=digest(data),gitSha256=digest(baseline)))
js('baseline-hashes.json',dict(base=BASE,files=protected))

# Lexical inventory includes definitions and methods, classified by reviewer in closure.md.
rows=[]
for p in sorted([* (ROOT/'src').rglob('*.ts'),* (ROOT/'test').rglob('*.ts')]):
    s=p.read_bytes().decode(); m=mask(s)
    for hit in re.finditer(r'\b('+'|'.join(helpers+['createMutableBinding','failure','constructorSlot'])+r')\b',m):
        line=s.count('\n',0,hit.start())+1
        rows.append(dict(path=p.relative_to(REPO).as_posix(),line=line,name=hit[1],text=s.splitlines()[line-1].strip()))
js('current-sites.json',rows)
print(json.dumps(dict(proposedFiles=len(manifest),replacements=sum(len(f['replacements']) for f in manifest),protected=len(protected),inventoryRows=len(rows))))
