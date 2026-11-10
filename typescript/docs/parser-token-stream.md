# Incremental Script token access

Structural Script parsing now requests tokens through one indexed accessor backed by the incremental lexer. It retains consumed tokens for declaration ranges, directive detection and audit records. Bounded lookahead scans only what the requesting parser production needs; previous-token reads use the same array. EOF remains stable.

Public lexical failure precedence is unchanged. After parsing stops, the lexer finishes the source, and any lexical diagnostic takes precedence over the parser diagnostic just as it did under eager lexing. This also preserves the separator audit's distinct mode. Legacy expression parsing and the legacy return audit retain their existing eager entry points.

The arrow cover refactor removes the only unbounded parenthesis lookahead. Regex admission can now rescan a primary-expression slash before ordinary scanning touches its body. That integration remains separate: this change admits no new syntax and does not infer a lexical goal from the previous token.

Focused tests exercise templates, labelled loops, contextual declarations, methods, directives, division across newlines, automatic semicolon insertion and late lexical failures following earlier parser failures. Both hosts pass at 11055 static statements, zero dynamic. All 679 Node guests pass. The 341 existing fixture sources retain exact results in nine parser/plan/audit APIs (3069 comparisons). Full canonical acceptance follows integration.
