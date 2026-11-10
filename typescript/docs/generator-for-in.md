# Generator for-in enumeration

For-in continuations retain the existing property enumerator and share iteration
binding setup with for-of. Resumption preserves enumeration progress and lexical
cells. Each step observes the enumerator's existing deletion/shadowing rules;
nullish inputs still finish immediately.

Enumeration has no iterator return protocol. Break/continue are handled at the
enumeration record, while return/throw proceed to enclosing finally or for-of
cleanup. Tests cover key order, deleted keys, prototype shadowing, bindings and
patterns, TDZ, foreign-session cells and nested cleanup. Labelled and nested
expression suspension remain subsequent work.
