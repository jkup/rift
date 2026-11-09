# String HTML wrapper methods

TS-133 adds the thirteen Annex B HTML wrapper methods to Script String.prototype: anchor, big, blink, bold, fixed, fontcolor, fontsize, italics, link, small, strike, sub and sup. Legacy Realms are unchanged.

One registration helper implements CreateHTML. Receiver coercion completes before attribute coercion, nullish receivers fail before either conversion hook, and methods without an attribute ignore extra arguments. Only double quotes in attribute values become &quot;; string contents and other characters remain unchanged. The result is a primitive string, with no DOM processing.

Attribute scanning charges each UTF-16 code unit and collects unchanged spans around quotes, joining once at the end. This avoids repeatedly copying an expanding result. Builtin registration supplies ordinary nonconstructable function metadata and defining-Realm invocation, including error allocation.

References consulted 2026-11-09: [CreateHTML](https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-createhtml) and V8's [string-html.tq](https://github.com/v8/v8/blob/main/src/builtins/string-html.tq). The shared receiver/attribute order follows those algorithms; Rift uses explicit completions and a budgeted span scan rather than V8's quote-escaping runtime helper.

Focused tests cover all thirteen exact wrappers and metadata, attribute quoting, generic receivers, coercion order, nullish/Symbol errors, ignored arguments, cross-Realm failures, UTF-16 preservation and bounded scanning. Full acceptance is pending.
