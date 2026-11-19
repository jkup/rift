# E3d-P decimal guard design correction

Candidate ecaf687 was not accepted. Root actual/final second review identified
the known scriptc guard pattern in preflightDecimal. This proposal changes only:

```ts
if (text.length === 0) throw new Error("script-preflight/limit");
```

The digit loop, Number conversion, safe-integer check, error prefix/precedence,
all dispatch behavior and every other file proposal are unchanged. Review cites
the accepted E3b request-boundary reduction and root evidence at
`build/ts035e3b-root-decimal` for the static lowering pattern. This correction
does not rerun a compiler or claim new native evidence.

The authoritative full-file mapping is this directory's proposal-manifest.json.
It still proposes three replacements and one addition. Only the observer proposal
is new here; the other three point to unchanged complete ecaf687 proposal bytes.
The old proposal, manifest, source descriptor, artifact hashes, source copies and
results remain unchanged in correction/. The original main design is saved here.
The new source descriptor changes only that source member/hash and its digest.
No API, argv, fixture literal, test assertion, schema or production file changed.

Offline reproduction:

```text
node typescript/docs/validation/ts-035e3d-p/decimal-correction/verify.mjs
node typescript/docs/validation/ts-035e3d-p/decimal-correction/decimal-probe.mjs
node typescript/docs/validation/ts-035e3d-p/decimal-correction/probe.mjs
```

The decimal probe applies 24 independent literal cases to the prior candidate,
corrected candidate and accepted E3b isolated helper:72 exact value/error checks.
It covers empty input, zero, leading zeroes, MAX_SAFE_INTEGER, leading-zero MAX,
unsafe magnitude, signed/decimal/exponent/whitespace/hex/separator/Unicode/NUL
inputs. Every numeric result also rejects negative zero. All three are trusted
host decimal helpers; no Realm, parser, engine or compiler is loaded.

The copied boundary probe changes only its evidence lookup to the original
frozen corpus and reads the corrected proposal. It passes160 full prepared
records,64argv/7source negatives,13actual pure-source mutants,160codec literals
and1280oracle-sensitivity comparisons. Output directories decimal-crpT0m and
boundary-tMLWLA retain exact sources/results. No oracle was regenerated.

The verifier preserves8498baseline files, all84ecaf687 correction artifacts,
15original checkpoint files and both original design versions. It verifies the
291-member descriptor and exact one-line inverse to the original ecaf687 full
proposal. It redirects the old artifact manifest's main-document entry to the
saved copy instead of rewriting old hashes. --implemented is for future exact
installation checks only; it does not authorize implementation.

The unchanged dispatch/driver/oracle audits were independently replayed by root
before this bounded correction. Their evidence remains inherited, not a fresh
claim in this directory. All160 future child/report/binding literals and all
deferrals remain unchanged: host-service/build certification, parent preflight
success authority, archive/private owner/receipts/F are not implemented.

Stop after the corrected design commit for actual/second/root affected audit.
No production changes, full builds, guest/native launches, publication or
successor work.
