// DESIGN ONLY. No parser implementation or executable object reader is supplied.
// All object shapes are closed: no extra keys. Hex is lowercase even-length.
export type Identity = { bytes: number; sha256: string };
export type Name = {
  fieldHex: string; bytesHex: string;
  encoding: 'inline' | 'string-table'; stringOffset: number | null;
};
export type Header = {
  machine: number; sectionCount: number; timestamp: number;
  symbolTableOffset: number; symbolSlotCount: number;
  optionalHeaderBytes: number; characteristics: number;
};
export type Relocation = {
  index: number; virtualAddress: number; symbolSlot: number; type: number;
  offsetInSection: number | null; width: number;
};
export type Section = {
  index: number; name: Name; virtualSize: number; virtualAddress: number;
  rawSize: number; rawOffset: number; relocationOffset: number;
  lineOffset: number; relocationCount: number; lineCount: number;
  characteristics: number; rawSha256: string | null;
  relocations: Relocation[];
};
export type Symbol = {
  slot: number; name: Name; value: number; sectionNumber: number;
  type: number; storageClass: number; auxiliaryCount: number;
  classification: 'section-defined' | 'undefined' | 'common' | 'absolute' | 'debug';
  auxiliary: { slot: number; hex: string }[];
};
export type Directive = {
  sectionIndex: number; offset: number; bytes: number; hex: string;
  infoFlag: boolean;
};
export type Inventory = {
  kind: 'inventory'; format: 'coff-amd64-standard'; input: Identity;
  header: Header; sections: Section[]; symbols: Symbol[];
  stringTable: { offset: number; bytes: number; sha256: string } | null;
  directives: Directive[];
  fltused: { symbolSlots: number[]; relocationSites: { sectionIndex: number; relocationIndex: number }[] };
};
export type ErrorCode =
  | 'INPUT_TYPE' | 'INPUT_LIMIT' | 'TRUNCATED_HEADER'
  | 'UNSUPPORTED_ARCHIVE' | 'UNSUPPORTED_IMAGE' | 'UNSUPPORTED_ANONYMOUS'
  | 'UNSUPPORTED_MACHINE' | 'UNSUPPORTED_OPTIONAL_HEADER'
  | 'SECTION_LIMIT' | 'SYMBOL_LIMIT' | 'RELOCATION_LIMIT' | 'STRING_LIMIT' | 'NAME_LIMIT' | 'DIRECTIVE_LIMIT'
  | 'TRUNCATED_SECTIONS' | 'TRUNCATED_RAW' | 'RAW_POINTER' | 'UNSUPPORTED_BSS_RELOCATIONS'
  | 'UNSUPPORTED_LINES' | 'UNSUPPORTED_RELOCATION_OVERFLOW'
  | 'RELOCATION_POINTER' | 'TRUNCATED_RELOCATIONS' | 'UNSUPPORTED_RELOCATION_TYPE'
  | 'RELOCATION_ADDRESS' | 'RELOCATION_SYMBOL'
  | 'SYMBOL_POINTER' | 'TRUNCATED_SYMBOLS' | 'TRUNCATED_STRINGS' | 'STRING_SIZE'
  | 'AUXILIARY_RANGE' | 'SYMBOL_SECTION' | 'NAME_OFFSET' | 'NAME_TERMINATOR'
  | 'NAME_PADDING' | 'SECTION_NAME_ENCODING' | 'OVERLAP' | 'NAME_TOTAL_LIMIT' | 'OUTPUT_LIMIT';
export type Rejected = { kind: 'rejected'; input: Identity | null; error: { code: ErrorCode; offset: number | null } };
// Pure future API: copied owned Uint8Array (Buffer allowed); reject SharedArrayBuffer
// backing, detached/resizable backing and non-byte views as INPUT_TYPE. No I/O.
export declare function inspectCoff(bytes: Uint8Array): Inventory | Rejected;
export type Binding = { index: number; role: 'runtime' | 'program'; path: string; absolute: string; bytes: number; sha256: string };
export type BindingError = { kind: 'binding-error'; index: number | null; code: 'ORDER' | 'PATH' | 'IDENTITY' | 'ARCHIVE' | 'ARCHIVE_LIMIT' };
export type Batch = { kind: 'batch'; base: '903a7e56ef9c081d57662d5bcabb9221d6555389'; entries: { binding: Binding; result: Inventory | Rejected }[] };
// Future archive-only adapter: fixed sealed binding + inventory + compressed chunks.
// Return exactly 42 ordered entries or a BindingError, never success for a subset.
// The caller retains every Rejected; no source/output launch, lookup or retry.

export declare function inventoryBoundArchive(): Batch | BindingError;

// Pure future binding check against the sealed 42-row literal; never opens paths.
export declare function validateBindings(candidate: unknown): BindingError | null;
