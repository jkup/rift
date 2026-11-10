# PlainTime arithmetic

PlainTime add/subtract convert duration inputs through the same branded, string
and property-bag paths as Duration.from. Validated date components are ignored;
only hours through nanoseconds enter time arithmetic. Exact BigInt sums wrap
modulo one day, correcting negative remainders before producing six time fields.
Results are fresh intrinsic PlainTime objects in the defining Realm.

The implementation follows [AddDurationToTime](https://tc39.es/proposal-temporal/#sec-temporal-adddurationtotime)
and AddTime. Shared duration conversion preserves the ordering and resource
behavior reviewed against engine262 at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover signed wrapping, ignored date units, nanosecond carry and unsafe
integer amounts, public overrides, abrupt completion, metadata and Realm/subclass
behavior. Duration record/conversion and PlainTime conversion regressions are
retained under build/temporal-plain-time-arithmetic-*; combined acceptance is pending.
