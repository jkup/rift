# String and RegExp replacement

String.replace performs symbol dispatch before coercing its receiver or replacement. Its fallback searches for the first literal string occurrence. Noncallable replacements convert before searching, including when there is no match; callable replacements receive undefined as this, followed by the matched string, position and input.

RegExp Symbol.replace is generic over objects. It converts the input and noncallable replacement before reading flags, resets global lastIndex and collects all exec result objects before invoking replacement callbacks. Each result's length, full match, index, captures and groups are then observed in specification order. Positions are clamped to the input range. Overlapping custom results still run conversions and callbacks, but their replacement text is omitted. Empty global matches advance with the shared UTF-16/u/v algorithm.

GetSubstitution supports dollar escaping, full match, prefix/suffix, one- and two-digit captures, unmatched captures and named properties supplied by custom exec results. Named pattern syntax remains unsupported. Callback replacements receive the original groups value when present; template replacements apply ToObject to it, even if the template has no named reference.

Collection, capture reads, template scanning and output expansion use the operation budget. ReplacementText charges each emitted UTF-16 unit before retaining a chunk, then joins the chunks once. This bounds templates that repeatedly expand a large prefix/suffix and avoids repeatedly copying an accumulated output string. No-match results can reuse the original input.

Semantics follow [ECMAScript 2025 String.replace and GetSubstitution](https://262.ecma-international.org/16.0/#sec-string.prototype.replace) and [RegExp Symbol.replace](https://262.ecma-international.org/16.0/#sec-regexp.prototype-%symbol.replace%), reviewed against [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExpPrototype.mts). ReplaceAll, split, matchAll and literal syntax are separate work.
