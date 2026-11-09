# Context projection compiler probe

With scriptc 0.4.7, both probes compile with 6/6 static statements and no dynamic operations. Node prints shared for both. Native prints copied when the active context has a required callback and its readonly view has an optional callback; matching optional declarations restores shared. The probe changes the referenced Realm after assigning the view, then tests identity through that view.

This reduced the distinct-constructor draft's native invalid Script context Realm failure, which also affected an ordinary cross-Realm new expression. No compiler pin or dynamic execution setting changed. ActiveOperationContext and OperationContext now give the construction callback matching optional declarations; the canonical context remains shared and engine-writable.

Run each .ts source with Node, then scriptc build SOURCE --tier static-only -o OUTPUT and scriptc coverage SOURCE. The logs retain both the failing semantic case and the matched control. This is a measured constraint on the pinned compiler, not a general claim about all structural type conversions.
