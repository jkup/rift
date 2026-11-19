# Date time setters

TS-401 adds setTime and the local/UTC hours, minutes, seconds and milliseconds setters. Local methods use the engine's UTC timezone policy. Argument conversion follows the specified order and methods read their original time slot before coercion. For an invalid original time, component setters return NaN without overwriting mutations performed by coercion hooks. setTime can recover invalid dates.

Tests cover defaults, overflow, clipping, negative fractions, observable coercion and abrupt completion, frozen objects, branding and defining-Realm errors. Calendar setters remain separate work.

A later combined Date review checked 2,500 deterministic numeric setter cases against Node under UTC, comparing both returned and stored values. All matched. The driver and report are build/check-date-method-oracle.mjs and build/date-method-oracle.json.
