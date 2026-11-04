"""Offline proposal renderer; writes only beneath this evidence directory."""
from pathlib import Path
import subprocess, json, hashlib, difflib, re
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
BASE = subprocess.check_output(['git','rev-parse','4eb954d'],cwd=REPO,text=True).strip()
def sha(b): return hashlib.sha256(b).hexdigest()
def put(p,b):
    target=HERE/p; target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(b if isinstance(b,bytes) else b.encode())
def js(p,x): put(p,json.dumps(x,indent=2)+'\n')
def baseline(p): return subprocess.check_output(['git','show',BASE+':'+p],cwd=REPO)
edits={}
def replace(file,old,new,reason):
    p='typescript/test/'+file; raw=baseline(p)
    if b'\r\n' in raw: old=old.replace('\n','\r\n'); new=new.replace('\n','\r\n')
    needle=old.encode(); assert raw.count(needle)==1,(file,old)
    start=raw.index(needle)
    edits.setdefault(p,[]).append(dict(start=start,end=start+len(needle),old=old,new=new,reason=reason))
replace('script-realm-bootstrap.ts','const globals=[...legacyGlobals,"Error","TypeError","ReferenceError","RangeError","SyntaxError"];','const globals=[...legacyGlobals,"Error","TypeError","ReferenceError","RangeError","SyntaxError","String","Object"];','Append C globals; legacy five and B globals retain order and descriptor loop.')
replace('script-realm-bootstrap.ts','[["valueOf","toString"],["name"','[["valueOf","toString","constructor"],["name"','Append Object constructor without changing existing keys.')
replace('script-realm-bootstrap.ts','["length","toString","valueOf"],["toString","valueOf",wellKnownToPrimitive','["length","toString","valueOf","constructor"],["toString","valueOf",wellKnownToPrimitive','Append String constructor without changing existing keys.')
replace('script-realm-bootstrap.ts','            } else method(a,p,k,k,k==="call"||k==="join"||(i===4&&k==="toString")?1:0);','''            } else if (k==="constructor") {
                check(i===0 || i===5,"only formatting prototype constructors");
                const name=i===0?"Object":"String", v=own(p,k), f=object(v), callable=f.callable, slot=f.constructorSlot;
                desc(p,k,v,true,false,true); desc(a.globalObject,name,v,true,false,true);
                keys(f,["name","length","prototype"]);
                desc(f,"name",{kind:"string",value:name},false,false,true); desc(f,"length",n(1),false,false,true);
                desc(f,"prototype",obj(p),false,false,false);
                check(f.getPrototypeOf()===a.functionPrototype && callable!==null && callable.kind==="builtin" && callable.realm===a && slot!==null && slot.kind==="builtin-constructor" && slot.realm===a && slot.callable===callable,"formatting constructor graph and matching slots");
                check(f.getOwnProperty("caller")===undefined && f.getOwnProperty("arguments")===undefined,"constructor inherited restrictions");
            } else method(a,p,k,k,k==="call"||k==="join"||(i===4&&k==="toString")?1:0);''','Separate genuine constructor metadata from old method-only checks; preserve all old method/restricted checks.')
replace('harness-errors-a.ts','["undefined", "NaN", "Infinity", "console", "Number", "Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError"]), "exact B globals");','["undefined", "NaN", "Infinity", "console", "Number", "Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError", "String", "Object"]), "exact C globals");\n    for (const name of ["String", "Object"]) {\n        const global = r.globalObject.getOwnProperty(name), p = name === "String" ? r.stringPrototype : r.objectPrototype;\n        check(global !== undefined && global.kind === "data" && global.value.kind === "object" && global.writable && !global.enumerable && global.configurable, "formatting global flags");\n        if (global === undefined || global.kind !== "data" || global.value.kind !== "object") throw new Error("formatting global");\n        const ctor = global.value.object, link = p.getOwnProperty("constructor"), target = ctor.getOwnProperty("prototype"), callable = ctor.callable, slot = ctor.constructorSlot;\n        check(link !== undefined && link.kind === "data" && sameValue(link.value, global.value) && link.writable && !link.enumerable && link.configurable, "formatting constructor identity/flags");\n        check(target !== undefined && target.kind === "data" && target.value.kind === "object" && target.value.object === p && !target.writable && !target.enumerable && !target.configurable, "formatting prototype identity/flags");\n        check(ctor.getPrototypeOf() === r.functionPrototype && callable !== null && callable.kind === "builtin" && callable.realm === r && slot !== null && slot.kind === "builtin-constructor" && slot.realm === r && slot.callable === callable, "formatting guarded constructor graph");\n    }','Extend exact inherited A inventory and positively check C links/flags/slots; all Error graph/brand/identity/legacy assertions preserved.')
manifest=[]; patch=''
for p,changes in edits.items():
    raw=baseline(p); result=raw
    for e in sorted(changes,key=lambda e:e['start'],reverse=True): result=result[:e['start']]+e['new'].encode()+result[e['end']:]
    relative=p.removeprefix('typescript/')
    put('proposed/'+relative,result)
    manifest.append(dict(path=p,baseSha256=sha(raw),proposedSha256=sha(result),replacements=sorted(changes,key=lambda e:e['start'])))
    patch+=''.join(difflib.unified_diff(raw.decode().splitlines(keepends=True),result.decode().splitlines(keepends=True),fromfile='a/'+p,tofile='b/'+p))
put('proposed.patch',patch); js('replacement-manifest.json',dict(base=BASE,files=manifest))
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=REPO,text=True).splitlines()
protected=[]
for p in paths:
    if p in ['typescript/TASKS.md','typescript/COORDINATION.md']: continue
    # Hash git blobs, not checkout-normalized line endings. Verifier also checks diff.
    protected.append(dict(path=p,sha256=sha(baseline(p))))
js('baseline-hashes.json',dict(base=BASE,files=protected))
matches=[]
for p in paths:
    if p.startswith('typescript/test/') and p.endswith('.ts'):
        for n,line in enumerate(baseline(p).decode().splitlines(),1):
            if re.search(r'(globalObject|[Ss]tringPrototype|[Oo]bjectPrototype|["\'](?:String|Object)["\'])',line):
                matches.append(dict(path=p,line=n,text=line))
js('consumer-search.json',dict(base=BASE,scope='All tracked test TypeScript files; broad candidate list, not automatic ownership',matches=matches))
print(json.dumps(dict(files=len(manifest),replacements=sum(len(x['replacements']) for x in manifest),protected=len(protected),consumerMatches=len(matches))))
