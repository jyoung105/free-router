import test from "node:test";
import assert from "node:assert/strict";
import { runInPty, stripAnsi } from "../helpers/run-pty.js";
import { BIN_PATH, ROOT_DIR } from "../helpers/test-paths.js";
import { cleanupTempHome, makeTempHome } from "../helpers/temp-home.js";

const SKIP = process.platform === "win32";

test(
  "CLI fresh start uses terminal wizard path without React hook crash",
  { skip: SKIP && "PTY harness uses python pty (not available on Windows)" },
  async () => {
    const home = makeTempHome();
    try {
      const result = await runInPty(process.execPath, [BIN_PATH], {
        cwd: ROOT_DIR,
        env: { HOME: home },
        inputChunks: [
          { delayMs: 500, data: "\u001b" },
          { delayMs: 900, data: "\u001b" },
          { delayMs: 2600, data: "q" },
        ],
        timeoutMs: 8_000,
      });

      const output = stripAnsi(`${result.stdout}\n${result.stderr}`);
      assert.equal(result.timedOut, false);
      assert.equal(result.code, 0);
      assert.match(output, /Let's set up your API keys/i);
      assert.doesNotMatch(output, /Invalid hook call/i);
      assert.doesNotMatch(output, /useReducer/);
    } finally {
      cleanupTempHome(home);
    }
  },
);
