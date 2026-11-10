# Duration arithmetic

Duration add/subtract convert the right operand before rejecting years, months
or weeks. Days count as 24 hours. Exact signed BigInt totals are balanced into
the larger of the operands' largest units, including when subtraction cancels
that unit. Bounds are checked before and after conversion to Number fields.
Results are fresh intrinsic Duration objects in the defining Realm.

This follows [AddDurations](https://tc39.es/proposal-temporal/#sec-temporal-adddurations)
and engine262 at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover signed
carry, cancellation, date-unit rejection, conversion order, Number precision,
range endpoints and Realm/subclass behavior. Combined acceptance remains pending.
