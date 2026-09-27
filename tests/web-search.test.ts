import assert from "node:assert/strict";
import test from "node:test";

import * as webSearch from "../src/web-search.js";
import {
	formatPiWebAccessDoctorLines,
	getPiWebAccessStatus,
	getPiWebSearchConfigPath,
	loadPiWebAccessConfig,
} from "../src/pi/web-access.js";

test("web-search barrel re-exports the Pi web-access surface", () => {
	assert.equal(webSearch.getPiWebSearchConfigPath, getPiWebSearchConfigPath);
	assert.equal(webSearch.loadPiWebAccessConfig, loadPiWebAccessConfig);
	assert.equal(webSearch.getPiWebAccessStatus, getPiWebAccessStatus);
	assert.equal(webSearch.formatPiWebAccessDoctorLines, formatPiWebAccessDoctorLines);
});
