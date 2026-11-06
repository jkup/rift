type ObservationUnit = {id:string;role:"harness"|"test";text:string};
type ScriptObservationRequest = {nonce:string;requestSha256:string;action:"execute"|"parse-only";preflightId:string|null;steps:number;calls:number;units:ObservationUnit[]};
function producerIdentifier(value: string): boolean {
    if (typeof value !== "string" || value.length === 0) return false;
    for (let n = 0; n < value.length; n++) if (value.charCodeAt(n) < 33 || value.charCodeAt(n) > 126) return false;
    return true;
}
function producerHash(value: string): boolean {
    if (typeof value !== "string" || value.length !== 64) return false;
    for (let n = 0; n < value.length; n++) {
        const c = value.charCodeAt(n);
        if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return false;
    }
    return true;
}
// BEGIN closed conformance preflight prerequisite. Data only; no success token.
type PreflightRequest = { control: string; input: string; observation: ScriptObservationRequest };
function preflightNeed(ok: boolean, code: string): void { if (!ok) throw new Error("script-preflight/" + code); }
function preflightDecimal(text: string): number {
    if (text.length === 0) throw new Error("script-preflight/limit");
    for (let n = 0; n < text.length; n++) preflightNeed(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    preflightNeed(Number.isSafeInteger(value), "limit");
    return value;
}
function preflightSource(control: string, input: string): string {
    switch (control) {
        case "B01": return "\"use strict\"; assert(true); assert.sameValue(NaN,NaN); assert.sameValue(-0,-0);";
        case "B02": return "\"use strict\"; assert(false,'control');";
        case "B03": return "\"use strict\"; assert(false);";
        case "B04": return "\"use strict\"; assert.sameValue(0,-0);";
        case "B05": return "\"use strict\"; assert.throws(ReferenceError,function(){missing;});";
        case "B06": return "\"use strict\"; assert.throws(ReferenceError,function(){});";
        case "B07": return "\"use strict\"; assert.throws(ReferenceError,function(){throw 7;});";
        case "B08": return "\"use strict\"; assert.throws(ReferenceError,function(){throw new TypeError();});";
        case "B09": return "\"use strict\"; assert.throws(ReferenceError,function(){throw new Other();});";
        case "B10": return "\"use strict\"; assert.throws(TypeError,7);";
        case "B11": return "\"use strict\"; var e=Test262Error('x'); assert.sameValue(e.constructor,Test262Error); assert.sameValue(e.toString(),'Test262Error: x');";
        case "B12": return "\"use strict\"; Test262Error.thrower('control');";
        case "B13": return "\"use strict\"; assert._isSameValue=function(){throw 7;}; assert.sameValue(1,1,'control');";
        case "B14": return "\"use strict\"; assert(false,{toString:function(){throw 7;}});";
        case "B15": return "\"use strict\"; assert.sameValue({toString:function(){throw new TypeError();}},0);";
        case "B16": return "\"use strict\"; assert.sameValue({toString:function(){throw 7;}},0);";
        case "N01": return "\"use strict\"; assert.notSameValue(0,-0);";
        case "N02": return "\"use strict\"; assert.notSameValue(1,1);";
        case "I01": return input === "alpha" ? "\"use strict\"; assert.sameValue(7,7); throw 7;" : "\"use strict\"; assert.sameValue(11,11); throw 11;";
    }
    throw new Error("script-preflight/control");
}
// Exact pinned Test262 originals, including comments and line endings. LICENSE:
// test/fixtures/harness-bundle/LICENSE, revision91c70759363c46557b694792bf34a2551a7af5ba.
const preflightAssert = "// Copyright (C) 2017 Ecma International.  All rights reserved.\n// This code is governed by the BSD license found in the LICENSE file.\n/*---\ndescription: |\n    Collection of assertion functions used throughout test262\ndefines:\n  - assert\n  - compareArray\n  - formatIdentityFreeValue\n  - formatSimpleValue\n  - isNegativeZero\n  - isPrimitive\n---*/\n\n\nfunction isNegativeZero(value) {\n  return value === 0 && 1 / value === -Infinity;\n}\n\nfunction isPrimitive(value) {\n  return !value || (typeof value !== 'object' && typeof value !== 'function');\n}\n\nfunction formatIdentityFreeValue(value) {\n  switch (value === null ? 'null' : typeof value) {\n    case 'string':\n      return typeof JSON !== \"undefined\" ? JSON.stringify(value) : '\"' + value + '\"';\n    case 'bigint':\n      return String(value) + \"n\";\n    case 'number':\n      if (isNegativeZero(value)) return '-0';\n      // falls through\n    case 'boolean':\n    case 'undefined':\n    case 'null':\n      return String(value);\n  }\n}\n\nfunction formatSimpleValue(value) {\n  var basic = formatIdentityFreeValue(value);\n  if (basic) return basic;\n  try {\n    return String(value);\n  } catch (err) {\n    if (err.name === 'TypeError') {\n      return Object.prototype.toString.call(value);\n    }\n    throw err;\n  }\n}\n\nfunction assert(mustBeTrue, message) {\n  if (mustBeTrue === true) {\n    return;\n  }\n\n  if (message === undefined) {\n    message = 'Expected true but got ' + assert._toString(mustBeTrue);\n  }\n  throw new Test262Error(message);\n}\n\nassert._isSameValue = function (a, b) {\n  if (a === b) {\n    // Handle +/-0 vs. -/+0\n    return a !== 0 || 1 / a === 1 / b;\n  }\n\n  // Handle NaN vs. NaN\n  return a !== a && b !== b;\n};\n\nassert.sameValue = function (actual, expected, message) {\n  try {\n    if (assert._isSameValue(actual, expected)) {\n      return;\n    }\n  } catch (error) {\n    throw new Test262Error(message + ' (_isSameValue operation threw) ' + error);\n    return;\n  }\n\n  if (message === undefined) {\n    message = '';\n  } else {\n    message += ' ';\n  }\n\n  message += 'Expected SameValue(«' + assert._toString(actual) + '», «' + assert._toString(expected) + '») to be true';\n\n  throw new Test262Error(message);\n};\n\nassert.notSameValue = function (actual, unexpected, message) {\n  if (!assert._isSameValue(actual, unexpected)) {\n    return;\n  }\n\n  if (message === undefined) {\n    message = '';\n  } else {\n    message += ' ';\n  }\n\n  message += 'Expected SameValue(«' + assert._toString(actual) + '», «' + assert._toString(unexpected) + '») to be false';\n\n  throw new Test262Error(message);\n};\n\nassert.throws = function (expectedErrorConstructor, func, message) {\n  var expectedName, actualName;\n  if (typeof func !== \"function\") {\n    throw new Test262Error('assert.throws requires two arguments: the error constructor ' +\n      'and a function to run');\n    return;\n  }\n  if (message === undefined) {\n    message = '';\n  } else {\n    message += ' ';\n  }\n\n  try {\n    func();\n  } catch (thrown) {\n    if (typeof thrown !== 'object' || thrown === null) {\n      message += 'Thrown value was not an object!';\n      throw new Test262Error(message);\n    } else if (thrown.constructor !== expectedErrorConstructor) {\n      expectedName = expectedErrorConstructor.name;\n      actualName = thrown.constructor.name;\n      if (expectedName === actualName) {\n        message += 'Expected a ' + expectedName + ' but got a different error constructor with the same name';\n      } else {\n        message += 'Expected a ' + expectedName + ' but got a ' + actualName;\n      }\n      throw new Test262Error(message);\n    }\n    return;\n  }\n\n  message += 'Expected a ' + expectedErrorConstructor.name + ' to be thrown but no exception was thrown at all';\n  throw new Test262Error(message);\n};\n\nassert.compareArray = function (actual, expected, message) {\n  message = message === undefined ? '' : message;\n\n  if (typeof message === 'symbol') {\n    message = message.toString();\n  }\n\n  if (isPrimitive(actual)) {\n    assert(false, \"Actual argument [\" + actual + \"] shouldn't be primitive. \" + String(message));\n  } else if (isPrimitive(expected)) {\n    assert(false, \"Expected argument [\" + expected + \"] shouldn't be primitive. \" + String(message));\n  }\n  var result = compareArray(actual, expected);\n  if (result) return;\n\n  var format = compareArray.format;\n  assert(false, \"Actual \" + format(actual) + \" and expected \" + format(expected) + \" should have the same contents. \" + String(message));\n};\n\nfunction compareArray(a, b) {\n  if (b.length !== a.length) {\n    return false;\n  }\n  for (var i = 0; i < a.length; i++) {\n    if (!assert._isSameValue(b[i], a[i])) {\n      return false;\n    }\n  }\n  return true;\n}\n\ncompareArray.format = function (arrayLike) {\n  return \"[\" + Array.prototype.map.call(arrayLike, String).join(\", \") + \"]\";\n};\n\nassert._formatIdentityFreeValue = formatIdentityFreeValue;\n\nassert._toString = formatSimpleValue;\n";
const preflightSta = "// Copyright (c) 2012 Ecma International.  All rights reserved.\n// This code is governed by the BSD license found in the LICENSE file.\n/*---\ndescription: |\n    Provides both:\n\n    - An error class to avoid false positives when testing for thrown exceptions\n    - A function to explicitly throw an exception using the Test262Error class\ndefines: [Test262Error, $DONOTEVALUATE]\n---*/\n\n\nfunction Test262Error(message) {\n  if (!(this instanceof Test262Error)) return new Test262Error(message);\n  this.message = message || \"\";\n}\n\nTest262Error.prototype.toString = function () {\n  return \"Test262Error: \" + this.message;\n};\n\nTest262Error.thrower = function (message) {\n  throw new Test262Error(message);\n};\n\nfunction $DONOTEVALUATE() {\n  throw \"Test262: This statement should not be evaluated.\";\n}\n";
function parsePreflightArguments(args: string[]): PreflightRequest {
    preflightNeed(Array.isArray(args), "arguments");
    for (let n = 0; n < args.length; n++) preflightNeed(typeof args[n] === "string", "arguments");
    preflightNeed(args.length === 29 || args.length === 32, "argc");
    preflightNeed(args[0] === "conformance-preflight-v1", "purpose");
    preflightSource(args[1], "alpha");
    preflightNeed(args[2] === "alpha" || args[2] === "beta", "input");
    preflightNeed(args[3] === "conformance", "mode");
    preflightNeed(args[4] === "strict", "variant");
    preflightNeed(args[5] === "execute", "action");
    preflightNeed(producerIdentifier(args[6]), "nonce");
    preflightNeed(producerHash(args[7]), "request-hash");
    preflightNeed(args[8] === "-", "preflight");
    preflightNeed(args[9].length > 0, "result-path");
    const sourceUnits = preflightDecimal(args[10]), parseDepth = preflightDecimal(args[11]);
    const steps = preflightDecimal(args[12]), calls = preflightDecimal(args[13]);
    const evaluationDepth = preflightDecimal(args[14]), wallMs = preflightDecimal(args[15]);
    preflightDecimal(args[16]);
    const units: ObservationUnit[] = [];
    for (let n = 17; n < args.length; n += 3) {
        preflightNeed(args[n] === "u" + ((n - 17) / 3) && args[n + 1] === (n === args.length - 3 ? "test" : "harness") && args[n + 2].length > 0, "unit");
        units.push({ id: args[n], role: n === args.length - 3 ? "test" : "harness", text: "" });
    }
    preflightNeed(sourceUnits === 100000 && parseDepth === 128 && evaluationDepth === 256, "fixed-limit");
    preflightNeed(wallMs <= 2147483647, "wall-limit");
    return { control: args[1], input: args[2], observation: { nonce: args[6], requestSha256: args[7], action: "execute", preflightId: null, steps, calls, units } };
}
function preparePreflightRequest(args: string[], sourceTexts: string[]): PreflightRequest {
    const request = parsePreflightArguments(args), units = request.observation.units;
    preflightNeed(Array.isArray(sourceTexts) && sourceTexts.length === units.length, "source-texts");
    for (let n = 0; n < units.length; n++) preflightNeed(typeof sourceTexts[n] === "string", "source-texts");
    preflightNeed(sourceTexts[0] === preflightAssert, "harness-source");
    for (let n = 1; n < units.length - 2; n++) preflightNeed(sourceTexts[n] === preflightSta, "harness-source");
    preflightNeed(sourceTexts[units.length - 2] === preflightSource(request.control, request.input), "control-source");
    preflightNeed(sourceTexts[units.length - 1] === '"use strict";\n', "test-source");
    for (let n = 0; n < units.length; n++) units[n].text = sourceTexts[n];
    return request;
}
export function validateConformancePreflightArguments(args: string[]): void { parsePreflightArguments(args); }

export {preparePreflightRequest};
