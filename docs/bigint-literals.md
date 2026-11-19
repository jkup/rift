# BigInt literal syntax

The Script lexer recognizes decimal, binary, octal and hexadecimal integers with
an n suffix. Separators use the existing numeric scanner. Fractions, exponents,
leading-zero decimal forms, missing radix digits and adjacent identifier/digit
suffixes remain rejected. Raw text and source spans include the suffix.

Only validated tokens reach exact host BigInt conversion. Rejected radix forms
such as 0xn are marked invalid before the parser's rejection-only continuation;
otherwise that continuation could accidentally invoke host conversion on 0x.
Literal AST values retain exact integers. Literal property names share decimal
canonicalization across objects, classes and binding/assignment patterns.
Legacy grammar remains unchanged. Existing source-size/depth guards also apply
to BigInt literals; parsing does not allocate exponent-sized integers.

Historical rejection tests keep their exact inputs and now assert supported
values for 1n, 0x1n and separated BigInts. Dynamic-source and numeric-audit tests
were migrated explicitly. Initial failures remain in the local validation logs.

References: [numeric literal grammar and NumericValue](https://262.ecma-international.org/16.0/#sec-literals-numeric-literals).
