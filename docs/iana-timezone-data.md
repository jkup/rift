# Versioned IANA transition data

TS-478 adds internal data and transition lookup only. Named guest timezone
identifiers remain disabled. The generated IANA 2026f records contain all 440
compiled zones, 158 raw links and 26,448 transitions from the reviewed build.
Factory remains an internal record; these arrays are not an admission registry.

The generator verifies archive hashes, exact source data and the aggregate TZif
hash before writing deterministic TypeScript, license and provenance files.
Runtime code does not parse TZif or consult the operating system timezone.
Only offsets, absolute transition seconds and footer text are needed here;
original type/abbreviation metadata remains retrievable through pinned inputs.

Exact-name lookup finds compiled Zone records, without applying aliases or case
normalization. Transition lookup rejects noninteger and out-of-range seconds.
Before the first transition it uses type zero. At the final transition, and for
all instants in a record without transitions, it explicitly requests footer
recurrence. It never extends the last stored offset into the future.

The fixture covers all 52,896 transition boundaries, range endpoints, invalid
inputs, exact lookup and nine independent upstream offsets, including historical
second offsets and Samoa's date-line jump. All 942 Node cases, the focused native
driver and five existing native regression groups pass. The focused driver has
113 static statements and zero dynamic operations. The initial direct string
ordering failed the dynamic gate; runtime-input probes isolate that behavior,
and lookup now uses the existing UTF-16 stringCompare helper. Original failure
evidence is retained. Fifteen tooling builds, all 296 tooling tests and both-host
protocol checks pass. Combined integration acceptance remains pending.

Eight generator controls verify deterministic output and rejection of corrupted
archives, source metadata, license, zone records and alias records. The controls
leave generated outputs unchanged.

Regenerate from the reviewed input directory using
`node tools/generate-iana-timezone-data.mjs <review-directory>`; add `--check`
to verify bytes without writing. The provenance records upstream zic commands,
release URLs/hashes and the precise historical-data settings.
