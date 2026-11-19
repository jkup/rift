// Derive factual counts and exact JSON pointers from the retained batch only.
export function summarize(batch){
 const totals={inputs:0,sections:0,primarySymbols:0,symbolSlots:0,auxiliarySlots:0,relocations:0,directiveSections:0,directiveBytes:0,fltusedSymbols:0,fltusedRelocations:0,classifications:{},relocationTypes:{}};
 const count=(o,k)=>o[k]=(o[k]??0)+1;
 const entries=batch.entries.map((e,i)=>{
  const r=e.result,ref='/entries/'+i+'/result',classifications={},relocationTypes={};
  for(const s of r.symbols){count(classifications,s.classification);count(totals.classifications,s.classification);}
  const sections=r.sections.map((s,j)=>{for(const rel of s.relocations){count(relocationTypes,rel.type);count(totals.relocationTypes,rel.type);}return {ref:ref+'/sections/'+j,index:s.index,nameHex:s.name.bytesHex,rawSize:s.rawSize,rawOffset:s.rawOffset,rawSha256:s.rawSha256,relocations:s.relocations.length};});
  const relocations=sections.reduce((n,s)=>n+s.relocations,0),auxiliarySlots=r.symbols.reduce((n,s)=>n+s.auxiliaryCount,0);
  const directives=r.directives.map((d,j)=>({ref:ref+'/directives/'+j,...d}));
  const fltused={ref:ref+'/fltused',...r.fltused,symbols:r.fltused.symbolSlots.map(slot=>{const j=r.symbols.findIndex(s=>s.slot===slot);return {ref:ref+'/symbols/'+j,...r.symbols[j]};})};
  const row={binding:e.binding,ref,sections,primarySymbols:r.symbols.length,symbolSlots:r.header.symbolSlotCount,auxiliarySlots,classifications,relocations,relocationTypes,directives,fltused};
  totals.inputs++;totals.sections+=sections.length;totals.primarySymbols+=r.symbols.length;totals.symbolSlots+=r.header.symbolSlotCount;totals.auxiliarySlots+=auxiliarySlots;totals.relocations+=relocations;totals.directiveSections+=directives.length;totals.directiveBytes+=directives.reduce((n,d)=>n+d.bytes,0);totals.fltusedSymbols+=fltused.symbolSlots.length;totals.fltusedRelocations+=fltused.relocationSites.length;
  return row;
 });
 return {source:'result.json',referenceFormat:'RFC 6901 JSON Pointer; array indices are zero-based',interpretation:'Recorded inventory only; no symbol resolution, library compatibility or provenance authority.',totals,entries};
}
