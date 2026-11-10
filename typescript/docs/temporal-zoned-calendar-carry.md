# Zoned calendar carry

Expanded rounded differences can carry days into a week or month, then months into a year. Each candidate uses constrained ISO date addition at the origin's local clock time and must project into the Instant range before comparison. This preserves zoned boundary errors that plain date-time carry does not check.

UTC and fixed-offset zones are supported. Public difference rounding will compose this helper with checked calendar and time nudges.
