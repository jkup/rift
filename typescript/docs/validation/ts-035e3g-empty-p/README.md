# Empty-section raw-pointer design review

Design only, base `7c0b3b8056d4c7329bddb70ff7f404a88387a5d3`. The accepted reader and rejected42-entry observation remain unchanged. No proposed reader or test has been executed, and the archive inventory has not been repeated.

Microsoft's [COFF section table and section-data description](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#section-table-section-headers) associates payload size with SizeOfRawData and location with PointerToRawData. It recommends zero values for uninitialized sections, but does not explicitly require every zero-size section pointer to be zero. Object-file pointer alignment is described as a performance recommendation. The proposed rule below is a conservative inventory policy derived from zero addressed payload bytes, not a declaration that every accepted encoding is valid to every linker.

## Alternatives and selected rule

| Policy | Consequence |
| --- | --- |
| Existing: zero size requires zero pointer | Simple but rejects all42 retained inputs at this field; stronger than the explicit wording found. |
| Ignore every empty pointer including out-of-range values | Never dereferences payload, but admits arbitrary numeric positions with no location bound. |
| **Selected: bounds-check empty positions through EOF** | Preserve the numeric pointer; allow `0 <= rawOffset <= input.length`; reject a larger value. No addressed payload exists. |

For `rawSize===0`, a pointer beyond EOF produces `RAW_POINTER` at `sectionHeader+20`. This check retains its current phase: after line-number/overflow rejection and before relocation-pointer checks. In-bounds positions include header bytes, another section's data, unaligned positions and EOF itself; these are recorded positions, not payload references. Do not normalize or zero the numeric field.

An empty section has `rawSha256:null`. Do not call payload span/overlap registration, payload slicing or payload hashing, including SHA-256 of an empty buffer. Whole-input identity hashing remains unchanged. An empty `.drectve` retains its numeric offset, `bytes:0`, `hex:""` and INFO flag without dereferencing the pointer. Nonempty BSS with no stored bytes retains `DIRECTIVE_NO_BYTES`; it does not acquire synthesized zeros. Every nonempty span, truncation, overlap, symbol, relocation, scope and resource check is unchanged. A nonignored relocation against zero stored bytes still fails its original symbol/address checks; empty raw payload does not bypass relocation validation.

## Retained evidence and exact proposal

`support-review.json` decodes only the two uint32 fields already preserved in each rejected field window. All42 have zero raw size and a nonzero pointer within their recorded input size. This shows why the proposed rule would remove this particular early refusal; it does not predict later parser outcomes, directive contents or link compatibility. No actual object was reread or reparsed for this field review.

`reader.proposed.mjs.txt` is the complete proposed reader source. `reader-transformation.json` pins the accepted source and exactly three replacements: change empty-pointer refusal to beyond-EOF refusal; require nonzero size before span/overlap registration; require nonzero size before section-payload slicing/hashing. The existing directive empty-byte conditional already avoids slicing and is unchanged. APIs, closed output schema, fixed binding/adapter and budgets are unchanged. `rules.proposed.json` renders the corresponding full rules document with the narrow policy replacement.

`fixtures.original.json` preserves all83 accepted literals exactly. `fixtures.v2.json` changes only the full expected error for `empty-raw-pointer`, from RAW_POINTER@40 to RELOCATION_ADDRESS@108: that fixture also carries a real nonignored relocation against its now-empty section. Its bytes and every other expected result are unchanged. `expected-corrections.json` retains both complete expectations and the reason. This is a versioned proposed oracle correction, not a relabeling of an executed test or the rejected observation.

`empty-fixtures.json` contains32 independently authored full byte/result literals covering zero/nonzero size/pointer, zero/header/unaligned/EOF/out-of-range/max-uint32 empty positions, empty directives with/without INFO, genuine payload truncation and overlap, absent BSS/directives, neighbors, ignored/nonignored relocations and earlier line/overflow errors. Their writer does not import or invoke a reader. `tests.proposed.mjs.txt` is the complete proposed test source: the original suite uses the versioned83 plus the new32, and adds two direct no-empty-slice/no-extra-hash controls. Future expected totals are115 byte comparisons and260 synthetic checks; these are not pass claims. Other accepted synthetic/purity/resource tests remain required unchanged.

Source syntax and design-data consistency checks alone were run. Future implementation should materialize the exact proposed reader/test files in a separately authorized evidence-local implementation subtree, copy unchanged dependencies with hashes, run all frozen synthetic controls first and return for review. This handoff does not authorize that materialization, test execution, or another real archive observation. If any later expectation fails, retain it and stop; do not widen variants or weaken neighboring checks.

## Preservation

`verify.mjs` checks all13,039 accepted-base tracked files (1,881,023,055 raw checkout bytes), the accepted TASKS prefix plus this exact entry, source transformations, all retained original literals, and prior rejected-batch/archive evidence. Legacy guard copies use their exact historical TASKS view; the outer guard verifies the actual new task boundary. All changes to copied guards are explicit and hashed. No old rule, source, seal or history is regenerated.

Full provenance remains blocked; no symbol resolution, MSVC/GNU compatibility, library closure or authority follows from this proposal. No compiler, linker, dump tool, library lookup, object load/execution or generalized format expansion occurred. Stop for actual/root/second design review.
