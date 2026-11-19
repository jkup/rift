# PlainDate to PlainDateTime

PlainDate.toPlainDateTime uses midnight for an omitted or undefined time.
Other values use the shared PlainTime conversion with constrained overflow.
Receiver branding happens first, then time conversion, then DateTime bounds.
The minimum PlainDate therefore requires a time later than midnight.

DateTime.withPlainTime shares ToTimeRecordOrMidnight through the existing time
conversion module. Results use the defining Realm's intrinsic DateTime prototype,
independent of subclasses and replaced constructors. Extra arguments are ignored.

Reference: [Temporal.PlainDate.prototype.toPlainDateTime](https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplaindatetime)
and engine262 PlainDatePrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover bounds, constrained fields, branded operands, getter/coercion order,
error precedence, metadata and Realm ownership; existing DateTime parts and
PlainTime conversion tests cover the shared helper.
