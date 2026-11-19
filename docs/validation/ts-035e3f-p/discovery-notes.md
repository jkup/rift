# Discovery failures and retry record

No failure is counted as an expected rejection or build validation.

* Initial exploratory `Get-Content typescript/toolchain.json` failed: that file
  does not exist. Actual toolchain manifest is scriptc/bin/scriptc.exe.json.
* PowerShell Get-Command found Node/npm but not zig/tsc/scriptc in its PATH.
  Direct absolute package executable discovery was used; no PATH was changed.
* An rg call with literal `*.mjs` in Windows path operands failed OS error123.
  Directory plus `-g '*.mjs'` was used for subsequent source search.
* Reading compiler-string-hints.json while the inventory was still running
  reported missing file. The completed audit subsequently wrote it normally.
* `discovery-commands.json` retains bare Zig ENOENT and sandbox absolute
  `zig env` exit1/FileNotFound verbatim. These are discovery/environment faults.
* Permission-enabled absolute `zig env` was run once as read-only discovery,
  exit0. Its returned fields are transcribed in zig-env-retry.json. This was
  an approval-reviewed sandbox escape, not a change to process environment,
  installation, PATH or pins. The original failed result remains immutable.
* Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots
  and Get-ChildItem on C:\Program Files (x86)\Windows Kits\10,
  C:\Program Files\Microsoft Visual Studio and
  C:\Program Files (x86)\Microsoft Visual Studio all reported absent paths.
  This narrow search does not prove absence of SDK dependencies or other locations.
* uncertainty-NvD7NY/failure.json retains original hardlink EPERM, complete stack,
  and four prior traces; this incomplete run is not six passing cases.
* Permission-enabled rerun used identical uncertainty.mjs/literals and fresh
  uncertainty-hSU6Ue. Six complete literals and66 data-oracle mutations pass.
  No compiler or engine was invoked. The only two newly created alias directory
  entries were removed individually after exact identity/target checks; see
  alias-cleanup.json. The actual targets and traces remain. No recursive deletion.

The audit itself finished normally. Derived package checks had no mismatches.
No production/history/old-test mutation or workaround was made after discovery
errors. The proposed compilation metadata experiment remains unexecuted.
