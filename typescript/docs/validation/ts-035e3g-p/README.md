# TS-035E3g-P design only

Read [the design](../../script-object-inventory.md), contract.d.ts, rules.json and output-schema.json together. Fixtures are independently authored future expected results; none is a claimed parser pass. inspectCoff and inventoryBoundArchive are declarations only. The 42 original objects were not interpreted.

Run node check-design.mjs for data/shape consistency; node verify.mjs additionally checks every accepted-base path, exact TASKS boundary, all old E3f seals and original runtime trees through the exact boundary-adjusted guard copy, and the new seal. Neither command executes or implements a COFF reader. fixture-author.mjs is a reproducible authoring aid for this unimplemented proposal and overwrites only its own fixtures.json if deliberately rerun; it must not be used to bless parser output.

No implementation, execution, publication or successor is authorized by this handoff.
