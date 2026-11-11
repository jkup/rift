# Private element prerequisites

TS-458 adds internal private-name identities, lexical name environments and
receiver-owned storage. Private syntax and callable/frame environment capture
remain unsupported; this backend alone does not enable private class elements.

Each environment declaration creates a fresh identity. Lookup walks lexical
parents with a budget charge per environment. Duplicate declarations and
unresolved names are trusted-pipeline invariant failures; the future parser must
reject invalid source before reaching these operations.

GuestObject allocates its identity map only when an element is added. Private
entries are separate from properties, prototypes and extensibility. Addition
copies entry records, rejects duplicates and charges before mutation. Get/set/has
charge before lookup; accessor calls go through the supplied operation context.
Missing brands and missing accessor halves produce current-Realm TypeErrors;
methods cannot be assigned. Setter return values are discarded, while abrupt
completions propagate unchanged.

Tests cover lexical shadowing, fresh identities, receiver isolation, prototype
non-inheritance, nonextensible receivers, duplicate insertion, accessor argument
and completion forwarding, method reads/writes, primitive receivers, Realm error
prototypes and budget failures before mutation or calls. Accessor tests exercise
the backend context contract with trusted callbacks; actual private closure,
suspension and foreign-call environment propagation remain integration work.

The [private-elements review](class-private-elements-review.md) supplies the
specification references, initialization ordering and staged integration plan.
Both-host and combined acceptance remain pending.
