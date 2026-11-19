# Array concat

TS-085 adds Script Array.prototype.concat. It boxes the receiver, creates the
species result, then visits the receiver and arguments in order. Arrays
spread by default; ordinary objects remain single elements. IsConcatSpreadable
reads the internal well-known symbol first and uses ToBoolean without invoking
conversion hooks.

Each spread source captures its length once, then performs live HasProperty/Get
reads. Holes remain holes, inherited entries are copied, and result properties
are own data. Nonspread values retain identity. The final length write preserves
trailing holes. Every argument and source index consumes the step budget; safe
integer overflow is checked before copying that source.

The [species constructor](array-species.md) receives zero before any
spreadability reads and may return any object. Default arrays belong to the
method's Realm, including for foreign intrinsic Array constructors. Invalid
species, rejected property creation and failed final length writes throw
TypeError. Legacy Realms retain their previous public surface.

The implementation follows [Array.prototype.concat and IsConcatSpreadable](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.concat).
The C++ reference in src/builtins/array/array_accessors.cpp at base 7d7a687a spreads
all objects and fills holes; those shortcuts were not retained. Tests cover
ordinary objects, explicit spreadability overrides, sparse and inherited copies,
ordered mutation, coercion-free truthiness, safe length limits, resource guards,
Realm ownership, species precedence, getter throws and metadata.
