# Relative duration target construction

The shared helper constructs midnight at a relative PlainDate and the result of constrained duration addition. It balances day/time units exactly before calendar addition, including a negative sub-day borrow. The target must be a valid PlainDate, but the helper retains minimum-date midnight so consumers can apply their specified equal-target shortcut before PlainDateTime bounds.

Duration totals now use this helper unchanged. Duration rounding will use the same target calculation. Direct tests cover signed carries, leap-month constraints, full date endpoints and mixed-sign rejection; total regressions protect the extraction.

References: Temporal Duration.prototype.total/round and engine262 DurationPrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
