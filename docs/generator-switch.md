# Generator switch continuations

Switch selection reuses the ordinary discriminant and case-selector algorithm.
After selection, clause sequences retain the shared CaseBlock frame and run in
fallthrough order. Selectors and block instantiation are not repeated on resume.
A switch boundary consumes unlabelled break while other control continues through
outer loops, labels and cleanup.

Tests cover default placement, selector side effects, shared lexical cells and
TDZ, function declarations, fallthrough, return/throw, outer continue and yielding
finally. Duplicate lexical declarations retain their explicit declaration-conflict
classification. Yield in selectors/discriminants and nested expressions remains
unsupported.
