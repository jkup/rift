# TS-035E3h unicode-P: offline boundary localization

The previous recorder run remains FAILED. Its four lone-surrogate replacements are retained exactly, with no changed oracle or runtime acceptance. This package contains offline evidence and an unexecuted diagnostic design. All new executable JavaScript is file/guard validation, not the proposed PowerShell diagnostic.

## Measured and inferred evidence

`staged-literals.json` records byte offsets of the four ASCII JSON escapes in the retained 1872-byte `contract.json`, SHA f470e19ec3813a4bc283d6941de1f7de717bd0cd9dfcb8efeb41f714c28041f8. Node decoding here only makes the intended units inspectable. Config argv indices 5/6 become recorder argv indices 6/7; their intended D800/DC00 became FFFD. Raw command indices 175/179 and environment indices 770/776 also became FFFD. The valid pair D83D DE00 remained intact. These are measured endpoints, not measurements of intermediate PowerShell strings. `measured-differences.json` is an exact copy of the accepted failed observation.

The named installed `pwsh.deps.json` identifies Utility 7.6.5 and Newtonsoft.Json 13.0.4 (`dependency-metadata.json`). This does not establish the loaded assembly, assembly/source correspondence, or the exact executed implementation.

[Newtonsoft.Json 13.0.4 JsonTextReader.cs](https://github.com/JamesNK/Newtonsoft.Json/blob/13.0.4/Src/Newtonsoft.Json/JsonTextReader.cs#L1126-L1184) has an explicit mechanism matching the mismatch. ReadStringIntoBuffer parses a Unicode escape, replaces an isolated low surrogate, and replaces a high surrogate without a following escaped low surrogate. A valid escaped pair survives. The replacement constant is U+FFFD. This source therefore predicts the observed values for the four retained escapes. This is source-based localization of a candidate, not runtime proof that this branch executed.

Attempts to retrieve pinned PowerShell v7.6.5 and v7.6.0 JsonObject.cs from official raw GitHub returned cache-miss errors. Do not treat those failed retrievals as evidence of nonexistent tags or invent a line-level binding to JsonConvert.DeserializeObject. [Official ConvertFrom-Json documentation](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/convertfrom-json?view=powershell-7.6) supports the file-to-object boundary, not the precise installed parser branch. Because that binding and intermediate observations remain open, this package selects the separate diagnostic contract below rather than asserting a cure.

## Exact retained source path

Paths below are relative to the repository. The runtime tree and its accepted archive remain unchanged.

| Boundary | Source location | Supported conclusion |
| --- | --- | --- |
| Byte identity before text reading | `typescript/build/ts035e3h-link-command-observation/supervise.ps1:3-8` | SHA checks bytes before Get-Content -Raw and ConvertFrom-Json. ASCII backslash-u bytes are intact in retained input. Actual Get-Content string was not captured. |
| Parsed strings to arguments/environment | same wrapper `:16-20` | Enumerates property names, concatenates `=`, casts values to string, passes argv/environment as string arrays. No explicit encoding conversion in this source; exact cast behavior here was not measured. |
| Command quoting | runtime `supervisor.cs:43,152` | Quote iterates UTF-16 chars, only adds slash/quote escaping. Raw command is built from parsed config, so outer Node environment conversion alone cannot explain this mismatch. |
| Environment and launch | same `:148-150,34,156` | Ordinal sorting and NUL checks precede StringToHGlobalUni; CreateProcessW declares Unicode marshaling and receives the explicit environment pointer. No observed intermediate buffer or independent native guarantee is claimed. |
| Raw/native text reading | `typescript/docs/validation/ts-035e3h-capture-p/recorder.cs.txt:34-41,45-46` | Text and EnvironmentBlock read 16-bit units, append chars; native API buffers themselves were not independently observed. |
| Capture serialization | same `:43,47-51` | Units writes length then each char as ushort. BinaryWriter's Encoding.UTF8 constructor does not encode these numeric writes; it is not a supported culprit. CommandLineToArgvW alone also cannot explain an already changed raw-command field. |

Source operations after parsing are consistent with preserving already-replaced FFFD. That inference is sufficient to prioritize the parse boundary, not to eliminate every installed-runtime/native alternative. Source-to-binary trust, attempt coverage and provenance remain unresolved.

## Separate diagnostic contract, unapproved

`diagnostic-contract.json` freezes one proposed PowerShell invocation, exact ASCII input/source hashes, environment, output literals, bounds and cleanup. `diagnostic.ps1.txt` remains inert. It would print only ASCII code-unit hex at text/parsed/cast/pair boundaries and direct char controls. It calls no Add-Type, compiler, recorder, supervisor, native API, linker, or child command. No future artifact or root is created in this task.

The proposal is a fresh parser diagnostic, not a recorder rerun. Readiness must separately implement/review bounded capture and identity checks; execution requires separate authorization. Any missing line, stderr, unexpected exit, timeout or unexpected units is a stopped diagnostic failure. Even a predicted result would localize this parser path only, not repair or accept the failed recorder run.

Potential later fix, NOT applied: transport arbitrary UTF-16 as ASCII four-digit unit strings or bounded integer arrays, then explicitly reconstruct chars after JSON parsing for argv and environment values. Preserve all units, including isolated surrogates; reject malformed encodings and embedded NUL at the relevant OS boundary. Never normalize the existing oracle to FFFD. A future recorder test needs its own fresh-root/source/binary contract because the retained recorder root is consumed. Neither a fix nor that future test is authorized here.

Guard-authoring mistakes are retained in two JSON reports and the original authoring scripts. They concern a filename collision and selecting inputs.json instead of contract.json; no diagnostic or runtime action occurred. `verify.mjs` checks all baseline files, old guards/seals, original/archive runtime evidence, exact literals and this package manifest. Stop at actual/root/second review.
