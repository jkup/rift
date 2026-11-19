# Date ISO parsing

The parser implements the Date Time String Format directly, including reduced date forms, expanded years, 24:00, exactly three millisecond digits and colon-separated numeric offsets. Date-only and offset-free date-time inputs use the engine's UTC policy. Clipping happens after offset subtraction, so a local representation outside the UTC endpoint can still denote a valid endpoint.

Date and Temporal string grammars remain distinct: Date rejects annotations and leap seconds, while DD values from 1 through 31 can overflow a shorter calendar month through MakeDay. Nonconforming legacy strings are not handled by this helper; a later parser for the engine's own Date string formats will preserve required round trips.

Tests cover all reduced forms, zero/negative/expanded years, leap/overflow dates, negative milliseconds, offsets, endpoints and malformed fields. No host Date.parse is used.

Reference: https://tc39.es/ecma262/#sec-date-time-string-format.
