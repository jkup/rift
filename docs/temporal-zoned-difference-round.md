# Zoned difference rounding

Time-unit differences subtract instants directly. Calendar-unit differences compose local calendar decomposition, checked rounding windows or adjacent-day time rounding, and checked calendar carry. Exact nanosecond differences retain their specified fast path. The public until/since methods handle equal epochs before this helper; relative duration rounding must still check zero-duration calendar windows.

The helper assumes caller-validated unit ordering and rounding increments. Public conversion, option ordering, zone equality and since polarity are handled by the forthcoming builtin integration. The retained-month week-rounding regression follows TC39 PR 3319 rather than the older Node oracle behavior.
