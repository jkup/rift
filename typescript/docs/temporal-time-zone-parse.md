# Temporal timezone strings

TS-407 adds pure parsing for supported timezone identifiers: case-insensitive UTC and minute-precision fixed offsets. ISO date/time, year-month and month-day forms use the shared scanner. A timezone annotation takes precedence over Z or a numeric offset. Calendar annotations are syntactically checked but do not select a calendar for timezone resolution. Sub-minute offsets can occur in the ISO input when an annotation supplies the timezone; they cannot themselves become timezone identifiers.

Only UTC is available as a named timezone. Other IANA identifiers, including aliases, remain unsupported; there is no system-timezone lookup. Guest conversion and Now calendar projections remain separate work.

Tests cover direct identifiers, all supported ISO grammar branches, negative-zero normalization, annotation precedence and criticality, leap values, invalid dates/times and unsupported names.

Review against Node 26.13.0 found 20 differences in 170 distinct inputs. The current normative grammar and pinned engine262 agree with Rift on these cases: standalone times exclude Z; duplicate calendar annotations fail when either is critical; time/date ambiguity checks the complete time-plus-offset text, not a date-shaped prefix. Short year-month/month-day forms additionally require an ISO calendar annotation. The initial parser had admitted standalone Z and missed the short-date calendar restriction; both were corrected before native validation. An initial negative test for `2020-13[UTC]` was incorrect: it is a valid 20:20 time with offset -13 and a UTC annotation. Initial sources and the differential report remain under build.

References: [normative grammar, early errors and ParseISODateTime](https://github.com/tc39/proposal-temporal/blob/main/spec/abstractops.html), [pinned reference parser](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/parser/TemporalParser.mts). Node disagreement is recorded, not treated as a reason to change the grammar.
