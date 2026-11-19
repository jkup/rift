# One fixed offline inventory observation

Base `558613a4d4aeed6a279598e5483da16a063340b5`. The accepted empty-section adapter was invoked exactly once against its fixed42 sealed inputs. Outer exit0; all42 results are `inventory`, with no rejection or exception. The complete compact `result.json` is17,866,336 bytes, SHA-256 `62b5c7483ccd5001bb8274cde751a408612d0b573731f3a96b8b5a2ddac67039`, below the128MiB batch limit. `started.json`, `invocation.json` and `status.json` retain the invocation boundary and outcome. Every output was created exclusively.

`source-identities.json` identifies the nine exact accepted source/test/dependency files. They and the three fixed pins were hash-checked before the dynamic adapter import and checked again afterward; `before.json` equals `after.json`. The unchanged adapter performs the sealed archive reads and input identity checks. `validate-result.mjs` checks the retained JSON only: closed schema, exact42 ordered bindings, every input identity, full serialization/hash/bound, source-pin equality and reproducible summary. It does not rerun the reader or adapter.

## Factual inventory

`inventory-summary.json` contains per-input counts, section fields, complete raw directive records and `_fltused` records. Its `ref` fields are exact RFC6901 pointers into `result.json`; symbol and relocation arrays remain complete in that raw result. Totals count records, not unique names or resolved symbols.

| Recorded item | Count |
| --- | ---: |
| Inputs | 42 (41 runtime,1 program) |
| Sections | 14,416 |
| Primary symbols | 23,950 |
| Symbol slots including auxiliaries | 38,408 |
| Auxiliary slots | 14,458 |
| Section-defined primary symbols | 22,010 |
| Undefined primary symbols | 1,856 |
| Absolute / debug primary symbols | 42 /42 |
| Common primary symbols | 0 |
| Relocations | 49,202 |
| Relocation type1 /3 /4 | 2,303 /9,624 /37,275 |
| Raw directive sections /bytes | 0 /0 |
| `_fltused` primary symbols /relocation sites | 2 /0 |

The program, `result.json` pointer `/entries/41/result`, has5 sections,21 primary symbols,27 slots,6 auxiliary slots and38 relocations (35 type4,3 type3). Its `.data` section at `/entries/41/result/sections/1` preserves rawSize0, rawOffset925 and rawSha256 null. Its raw directives array is empty.

The exact `_fltused` bytes are `5f666c7475736564`. Runtime `scr_win.o`, binding40, has slot58, storageClass2, value0, sectionNumber24, classification `section-defined`: `/entries/40/result/symbols/34`. Program `probe.obj`, binding41, has slot24, storageClass2, value0, sectionNumber0, classification `undefined`: `/entries/41/result/symbols/19`. Both corresponding `/fltused/relocationSites` arrays are empty. These are separate recorded symbol facts; no cross-input resolution was attempted. All42 `/entries/<index>/result/directives` arrays are empty, so there are no raw directive bytes in this inventory.

## Preservation and review boundary

`preservation.json` seals all13,094 accepted-base tracked files except COORDINATION and the separately guarded TASKS boundary. `guard-transformations.json` records the exact changes to copied historical guards, their original evidence paths and historical task views. The outer verifier checks the real accepted task prefix and only this appended entry. No original result, source, fixture, manifest or seal was regenerated. The previous all42-rejected observation remains intact.

Run `node typescript/docs/validation/ts-035e3g-empty-observation/verify.mjs` for preservation and retained-result verification. Do not rerun `observe.mjs`: this authorization was for one invocation and its exclusive start file already exists.

No compiler, linker, dump tool, library lookup, object load/launch, build, install, pin or production change occurred. Inventory does not establish symbol resolution, library compatibility, successful linking or provenance authority. Full provenance remains blocked. Stop for actual/root/second review before any next action.
