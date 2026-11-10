# Zoned difference rounding

Time-unit differences subtract instants directly. Calendar-unit differences compose local calendar decomposition, checked rounding windows or adjacent-day time rounding, and checked calendar carry. Equal epochs and exact nanosecond differences retain their specified fast paths.

The helper assumes caller-validated unit ordering and rounding increments. Public conversion, option ordering, zone equality and since polarity are handled by the forthcoming builtin integration. The retained-month week-rounding regression follows TC39 PR 3319 rather than the older Node oracle behavior.
