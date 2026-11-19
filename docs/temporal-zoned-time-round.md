# Zoned time rounding

Rounds a zoned difference time remainder with exact signed integer arithmetic. Both the date-added local start and its adjacent day must project into the Instant range before rounding. Crossing that day carries one signed day and rounds the remainder again, as required by NudgeToZonedTime.

This helper supports the engine's UTC and fixed-offset zones. Named zones will require deriving the adjacent local day's actual epoch span. Public difference integration and calendar carry remain separate successors.
