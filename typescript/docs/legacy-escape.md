# Legacy escape and unescape

The two Script globals close the corresponding C++ API gap. They use guest
string conversion and preserve UTF-16 code units, including lone surrogates.
Encoding produces uppercase percent escapes; decoding leaves malformed sequences
unchanged and never decodes output a second time. These codecs do not perform
UTF-8 conversion.

Each scanning iteration checks the execution budget before adding output. An
iteration reads at most six input units; encoding emits at most six output units
per input unit. Output chunks are joined once. Guest coercion and errors use the
existing Realm-aware conversion path; neither function is constructible.

Typechecking, twenty-five reference-derived guest cases, the full UTF-16 round
trip, foreign-Realm errors, metadata, budget sweeps and existing URI/string Node
regressions pass. Full Node and native validation are pending. Historical
fixtures are unchanged. The reference review is in `legacy-escape-review.md`.

The initial regression plan named a nonexistent string-constructor driver. The
starter rejected it before creating a draft; the corrected plan uses the existing
string-methods driver. The initial plan is retained in build/ts472-initial-missing-regression.json.

The first full Node run passed 935/941 cases. Six exact-global assertions shared a current builtin inventory that lacked escape/unescape. Added precisely those two names to that literal; all six original runtime inputs and transcripts pass in focused Node reruns. Their three driver groups were added to native regression validation, now eleven groups and fourteen runtime inputs. The original log, result ledger and inventory source are retained under build/legacy-escape-initial-global-inventory-node.log and the draft build directory. Runtime codec source and historical fixture bytes were unchanged by this correction.
