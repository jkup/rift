// Frozen synthetic data only. No guest execution or protocol parsed from stdout.
import { readFileSync } from "node:fs";
import type { ChildV2 } from "../src/host/script-observation-types.js";
import { scriptObservationJSONRecord } from "../src/host/script-observation-json.js";
const input = readFileSync(process.argv[2], "utf8");
if (input !== "alpha" && input !== "beta") {
    throw new Error("input");
}
if (input === "alpha") {
    const row0: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: null,
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "normal" },
    };
    console.log(scriptObservationJSONRecord(row0));
    const row1: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: null,
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "normal" },
    };
    console.log(scriptObservationJSONRecord(row1));
    const row2: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
        },
    };
    console.log(scriptObservationJSONRecord(row2));
    const row3: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row3));
    const row4: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
        },
    };
    console.log(scriptObservationJSONRecord(row4));
    const row5: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row5));
    const row6: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
        },
    };
    console.log(scriptObservationJSONRecord(row6));
    const row7: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row7));
    const row8: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "unsupported-syntax", capabilityCode: "script.uncertified-conflict" },
    };
    console.log(scriptObservationJSONRecord(row8));
    const row9: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-syntax",
            capabilityCode: "script.uncertified-conflict",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row9));
    const row10: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "unsupported-profile", reasonCode: "strict" },
    };
    console.log(scriptObservationJSONRecord(row10));
    const row11: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-profile",
            reasonCode: "strict",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row11));
    const row12: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "unsupported-profile", reasonCode: "realm" },
    };
    console.log(scriptObservationJSONRecord(row12));
    const row13: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-profile",
            reasonCode: "realm",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row13));
    const row14: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row14));
    const row15: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row15));
    const row16: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "other",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row16));
    const row17: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "other",
                secondary: null,
            },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row17));
    const row18: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "available", name: "", realmId: "other", secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row18));
    const row19: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "available", name: "", realmId: "other", secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row19));
    const row20: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "instantiation", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row20));
    const row21: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "instantiation", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row21));
    const row22: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row22));
    const row23: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row23));
    const row24: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: null,
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "normal" },
    };
    console.log(scriptObservationJSONRecord(row24));
    const row25: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row25));
    const row26: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row26));
    const row27: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "non-callable", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row27));
    const row28: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "non-callable", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row28));
    const row29: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "non-string-name",
                name: null,
                realmId: "other",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row29));
    const row30: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "non-string-name",
                name: null,
                realmId: "other",
                secondary: null,
            },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row30));
    const row31: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "foreign-profile", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row31));
    const row32: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "foreign-profile", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row32));
    const row33: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "unregistered-realm",
                name: null,
                realmId: null,
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row33));
    const row34: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "unregistered-realm",
                name: null,
                realmId: null,
                secondary: null,
            },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row34));
    const row35: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "abrupt",
                name: null,
                realmId: null,
                secondary: {
                    site: { unitId: "u0", realmId: "other", location: { line: 1, column: 1 } },
                    valueKind: "string",
                    origin: "guest",
                },
            },
        },
    };
    console.log(scriptObservationJSONRecord(row35));
    const row36: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "abrupt",
                name: null,
                realmId: null,
                secondary: {
                    site: { unitId: "u0", realmId: "other", location: { line: 1, column: 1 } },
                    valueKind: "string",
                    origin: "guest",
                },
            },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row36));
    const row37: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "undefined",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row37));
    const row38: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "undefined",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row38));
    const row39: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "null",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row39));
    const row40: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "null",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row40));
    const row41: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "boolean",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row41));
    const row42: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "boolean",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row42));
    const row43: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "number",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row43));
    const row44: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "number",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row44));
    const row45: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "string",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row45));
    const row46: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "string",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row46));
    const row47: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "symbol",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row47));
    const row48: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "symbol",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row48));
    const row49: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
        },
    };
    console.log(scriptObservationJSONRecord(row49));
    const row50: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row50));
    const row51: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
        },
    };
    console.log(scriptObservationJSONRecord(row51));
    const row52: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row52));
    const row53: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
        },
    };
    console.log(scriptObservationJSONRecord(row53));
    const row54: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row54));
    const row55: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
        },
    };
    console.log(scriptObservationJSONRecord(row55));
    const row56: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row56));
    const row57: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
        },
    };
    console.log(scriptObservationJSONRecord(row57));
    const row58: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row58));
    const row59: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
        },
    };
    console.log(scriptObservationJSONRecord(row59));
    const row60: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row60));
    const row61: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "source-units", count: 100001, limit: 100000 },
    };
    console.log(scriptObservationJSONRecord(row61));
    const row62: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "source-units",
            count: 100001,
            limit: 100000,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row62));
    const row63: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "parse-depth", count: 129, limit: 128 },
    };
    console.log(scriptObservationJSONRecord(row63));
    const row64: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "812517e6336853a17ad4438ff861423e159d3b4e331f07be0b78c4b19a565d40",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "parse-depth",
            count: 129,
            limit: 128,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row64));
    const row65: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "steps", count: 101, limit: 100 },
    };
    console.log(scriptObservationJSONRecord(row65));
    const row66: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "steps",
            count: 101,
            limit: 100,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row66));
    const row67: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: { kind: "resource-limit", guardCode: "steps", count: 101, limit: 100 },
    };
    console.log(scriptObservationJSONRecord(row67));
    const row68: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "resource-limit",
            guardCode: "steps",
            count: 101,
            limit: 100,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row68));
    const row69: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "calls", count: 64, limit: 64 },
    };
    console.log(scriptObservationJSONRecord(row69));
    const row70: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "calls",
            count: 64,
            limit: 64,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row70));
    const row71: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: { kind: "resource-limit", guardCode: "calls", count: 64, limit: 64 },
    };
    console.log(scriptObservationJSONRecord(row71));
    const row72: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "resource-limit",
            guardCode: "calls",
            count: 64,
            limit: 64,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row72));
    const row73: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "evaluation-depth", count: 257, limit: 256 },
    };
    console.log(scriptObservationJSONRecord(row73));
    const row74: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "evaluation-depth",
            count: 257,
            limit: 256,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row74));
    const row75: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: { kind: "resource-limit", guardCode: "evaluation-depth", count: 257, limit: 256 },
    };
    console.log(scriptObservationJSONRecord(row75));
    const row76: ChildV2 = {
        driverVersion: 2,
        nonce: "alpha",
        requestSha256: "d7c62c3c13d2d05804594ea7f48275ade598f215c2014bd0994c3f96b488f359",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "resource-limit",
            guardCode: "evaluation-depth",
            count: 257,
            limit: 256,
            diagnostic: 'TypeError: text only alpha\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row76));
}
if (input === "beta") {
    const row0: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: null,
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "normal" },
    };
    console.log(scriptObservationJSONRecord(row0));
    const row1: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: null,
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "normal" },
    };
    console.log(scriptObservationJSONRecord(row1));
    const row2: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
        },
    };
    console.log(scriptObservationJSONRecord(row2));
    const row3: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row3));
    const row4: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
        },
    };
    console.log(scriptObservationJSONRecord(row4));
    const row5: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row5));
    const row6: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
        },
    };
    console.log(scriptObservationJSONRecord(row6));
    const row7: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row7));
    const row8: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "unsupported-syntax", capabilityCode: "script.uncertified-conflict" },
    };
    console.log(scriptObservationJSONRecord(row8));
    const row9: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-syntax",
            capabilityCode: "script.uncertified-conflict",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row9));
    const row10: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "unsupported-profile", reasonCode: "strict" },
    };
    console.log(scriptObservationJSONRecord(row10));
    const row11: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-profile",
            reasonCode: "strict",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row11));
    const row12: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "unsupported-profile", reasonCode: "realm" },
    };
    console.log(scriptObservationJSONRecord(row12));
    const row13: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-profile",
            reasonCode: "realm",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row13));
    const row14: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row14));
    const row15: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row15));
    const row16: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "other",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row16));
    const row17: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "other",
                secondary: null,
            },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row17));
    const row18: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "available", name: "", realmId: "other", secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row18));
    const row19: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "available", name: "", realmId: "other", secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row19));
    const row20: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "instantiation", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row20));
    const row21: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "instantiation", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row21));
    const row22: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row22));
    const row23: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "available",
                name: "ReferenceError",
                realmId: "test",
                secondary: null,
            },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row23));
    const row24: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: null,
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "normal" },
    };
    console.log(scriptObservationJSONRecord(row24));
    const row25: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row25));
    const row26: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row26));
    const row27: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "non-callable", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row27));
    const row28: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "non-callable", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row28));
    const row29: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "non-string-name",
                name: null,
                realmId: "other",
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row29));
    const row30: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "non-string-name",
                name: null,
                realmId: "other",
                secondary: null,
            },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row30));
    const row31: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "foreign-profile", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row31));
    const row32: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "foreign-profile", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row32));
    const row33: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "unregistered-realm",
                name: null,
                realmId: null,
                secondary: null,
            },
        },
    };
    console.log(scriptObservationJSONRecord(row33));
    const row34: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "unregistered-realm",
                name: null,
                realmId: null,
                secondary: null,
            },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row34));
    const row35: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "abrupt",
                name: null,
                realmId: null,
                secondary: {
                    site: { unitId: "u0", realmId: "other", location: { line: 1, column: 1 } },
                    valueKind: "string",
                    origin: "guest",
                },
            },
        },
    };
    console.log(scriptObservationJSONRecord(row35));
    const row36: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: {
                outcome: "abrupt",
                name: null,
                realmId: null,
                secondary: {
                    site: { unitId: "u0", realmId: "other", location: { line: 1, column: 1 } },
                    valueKind: "string",
                    origin: "guest",
                },
            },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row36));
    const row37: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "undefined",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row37));
    const row38: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "undefined",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row38));
    const row39: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "null",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row39));
    const row40: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "null",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row40));
    const row41: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "boolean",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row41));
    const row42: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "boolean",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row42));
    const row43: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "number",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row43));
    const row44: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "number",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row44));
    const row45: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "string",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row45));
    const row46: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "string",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row46));
    const row47: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "symbol",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
        },
    };
    console.log(scriptObservationJSONRecord(row47));
    const row48: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "throw",
            phase: "runtime",
            original: {
                valueKind: "symbol",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            constructor: { outcome: "absent", name: null, realmId: null, secondary: null },
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row48));
    const row49: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
        },
    };
    console.log(scriptObservationJSONRecord(row49));
    const row50: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row50));
    const row51: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
        },
    };
    console.log(scriptObservationJSONRecord(row51));
    const row52: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-number",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row52));
    const row53: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
        },
    };
    console.log(scriptObservationJSONRecord(row53));
    const row54: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row54));
    const row55: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
        },
    };
    console.log(scriptObservationJSONRecord(row55));
    const row56: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.object-to-string",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row56));
    const row57: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
        },
    };
    console.log(scriptObservationJSONRecord(row57));
    const row58: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row58));
    const row59: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
        },
    };
    console.log(scriptObservationJSONRecord(row59));
    const row60: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "unsupported-operation",
            phase: "runtime",
            capabilityCode: "runtime.map-species",
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row60));
    const row61: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "source-units", count: 100001, limit: 100000 },
    };
    console.log(scriptObservationJSONRecord(row61));
    const row62: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "source-units",
            count: 100001,
            limit: 100000,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row62));
    const row63: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "parse-depth", count: 129, limit: 128 },
    };
    console.log(scriptObservationJSONRecord(row63));
    const row64: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "20e0c3433c1a7892b96595b7033dcb019225263bfafbe78b406bc7ffb3bca512",
        mode: "conformance",
        operation: { stage: "test", phase: "parse", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: false,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "parse-depth",
            count: 129,
            limit: 128,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row64));
    const row65: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "steps", count: 101, limit: 100 },
    };
    console.log(scriptObservationJSONRecord(row65));
    const row66: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "steps",
            count: 101,
            limit: 100,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row66));
    const row67: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: { kind: "resource-limit", guardCode: "steps", count: 101, limit: 100 },
    };
    console.log(scriptObservationJSONRecord(row67));
    const row68: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "resource-limit",
            guardCode: "steps",
            count: 101,
            limit: 100,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row68));
    const row69: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "calls", count: 64, limit: 64 },
    };
    console.log(scriptObservationJSONRecord(row69));
    const row70: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "calls",
            count: 64,
            limit: 64,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row70));
    const row71: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: { kind: "resource-limit", guardCode: "calls", count: 64, limit: 64 },
    };
    console.log(scriptObservationJSONRecord(row71));
    const row72: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "resource-limit",
            guardCode: "calls",
            count: 64,
            limit: 64,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row72));
    const row73: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: { kind: "resource-limit", guardCode: "evaluation-depth", count: 257, limit: 256 },
    };
    console.log(scriptObservationJSONRecord(row73));
    const row74: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: null,
        result: {
            kind: "resource-limit",
            guardCode: "evaluation-depth",
            count: 257,
            limit: 256,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row74));
    const row75: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: { kind: "resource-limit", guardCode: "evaluation-depth", count: 257, limit: 256 },
    };
    console.log(scriptObservationJSONRecord(row75));
    const row76: ChildV2 = {
        driverVersion: 2,
        nonce: "beta",
        requestSha256: "555caba2b6bdd25ebd4fdecc4791f3a6cc39e1bf9014d214bc92cc9e453b6903",
        mode: "conformance",
        operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        source: { unitId: "u0", realmId: "other", location: { line: 2, column: 2 } },
        testBodyEvaluated: true,
        harnessValidated: false,
        preflightId: null,
        completedUnits: [],
        inspection: {
            original: {
                valueKind: "object",
                origin: "guest",
                site: { unitId: "u0", realmId: "test", location: { line: 1, column: 1 } },
            },
            operation: { stage: "test", phase: "body", unitId: "u0", realmId: "test" },
        },
        result: {
            kind: "resource-limit",
            guardCode: "evaluation-depth",
            count: 257,
            limit: 256,
            diagnostic: 'TypeError: text only beta\u0000"\\\ud800',
        },
    };
    console.log(scriptObservationJSONRecord(row76));
}
