import { decimal } from "./decimal.js";
try { console.log("value:" + decimal(process.argv[2])); }
catch (error) { if (error instanceof Error) console.log("error:" + error.message); else throw error; }
