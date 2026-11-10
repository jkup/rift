# Date host boundary review

The pinned backend passes nine UTC field/ISO cases spanning the full Date range, clipping and a finite clock smoke check with nine static statements and zero dynamic coverage. The complete probe is still OUTPUT-DIFF: four local-field/offset records disagree with Node for historical or extreme Europe/London dates. For example, epoch zero is 01:00 with offset -60 in Node but 00:00 with offset 0 natively. The initial discrepancy is retained in [the report](validation/date-host-review/fields-report.json), alongside [the probe](validation/date-host-review/fields.ts).

Guest Date will use an explicit UTC default timezone on both hosts. Calendar calculations, parsing and formatting belong to the engine; only current epoch milliseconds need the host clock. This keeps behavior deterministic across hosts without pretending the native local-time implementation is correct. System/IANA timezone selection is a separate feature. This review does not register Date or broaden guest behavior.

The host's default timezone is an implementation choice under ECMAScript SystemTimeZoneIdentifier. UTC is the engine's chosen policy, rather than an inference from the machine's timezone. UTC-only default timezone does not prevent parsing explicit numeric offsets.

References: https://tc39.es/ecma262/#sec-systemtimezoneidentifier and the earlier [native prerequisites](native-host-prerequisites.md).
