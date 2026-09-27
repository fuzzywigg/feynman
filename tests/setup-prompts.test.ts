import test from "node:test";
import assert from "node:assert/strict";

import { isInteractiveTerminal, SetupCancelledError } from "../src/setup/prompts.js";

test("SetupCancelledError uses a stable name and default message", () => {
	const error = new SetupCancelledError();
	assert.equal(error.name, "SetupCancelledError");
	assert.equal(error.message, "setup cancelled");
	assert.equal(new SetupCancelledError("custom").message, "custom");
});

test("isInteractiveTerminal requires both stdin and stdout TTYs", () => {
	const originalStdin = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
	const originalStdout = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

	try {
		Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
		Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
		assert.equal(isInteractiveTerminal(), true);

		Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: false });
		assert.equal(isInteractiveTerminal(), false);

		Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: false });
		Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
		assert.equal(isInteractiveTerminal(), false);
	} finally {
		if (originalStdin) {
			Object.defineProperty(process.stdin, "isTTY", originalStdin);
		} else {
			delete (process.stdin as { isTTY?: boolean }).isTTY;
		}
		if (originalStdout) {
			Object.defineProperty(process.stdout, "isTTY", originalStdout);
		} else {
			delete (process.stdout as { isTTY?: boolean }).isTTY;
		}
	}
});
