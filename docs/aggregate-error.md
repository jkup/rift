# AggregateError

AggregateError participates in the existing Realm-local error family, with Error as its constructor parent and Error.prototype as its prototype parent. Calls and construction create branded GuestError objects. Its constructor length is two; errors and message precede the optional cause options.

Construction selects the newTarget prototype, converts the message, installs cause, then consumes the errors iterator. Step/value failures propagate without closing the iterator, matching IteratorToList. The collected values are copied into a new array and installed as a writable, configurable, non-enumerable errors property. The array belongs to the invoked constructor's Realm even when newTarget selects a foreign prototype.

The implementation reuses existing message/cause conversion and constructor-prototype selection rather than introducing another error representation. The prototype has no errors property and is not a branded error instance. Infinite error iterables consume the existing step budget.

Reviewed against [ECMAScript 2025 20.5.7](https://262.ecma-international.org/16.0/#sec-aggregate-error-objects) and [engine262 AggregateError.mts at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/AggregateError.mts). Focused tests cover call/new/subclass behavior, descriptors, iterable copying, message/cause/iterator effect order, error phases, cross-Realm prototype and array allocation, and fatal bounds. Promise.any uses this intrinsic in a later task.
