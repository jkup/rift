The initial freeze is retained in `initial-freeze/`. Before staging, Git inspection
showed root `test262/` ignores also hid six isolated policy-copy artifacts, and
core.autocrlf=input would normalize their original CRLF bytes. Added only local
unignore rules and `* -text` attributes, then refroze the same exact proposals and
all evidence. No test, proposal, original input, failure output, preserved file or
runtime contract changed. The original ignore file and manifests remain retained.
