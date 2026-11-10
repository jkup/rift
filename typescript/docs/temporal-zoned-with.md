# ZonedDateTime field replacement

with rejects Temporal instances and calendar/timeZone-bearing objects before reading replacement fields. It shares ordered zoned field resolution with from, supplies local defaults, merges month/monthCode correctly and requires at least one supplied field. Options follow the fields, with prefer as the default offset policy. Explicit use/reject/ignore policies retain exact offset interpretation and ISO day prechecks.

Tests cover month-end constraints, preserved nanoseconds, offset-only replacement, coercion order, invalid partials, contradictory month fields, endpoint failures, intrinsic allocation and receiver-first errors. Existing from conversion regressions guard the shared resolver refactor. Reference: [ZonedDateTime.prototype.with](https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.with). Scope remains ISO and UTC/fixed offsets.
