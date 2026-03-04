// src/tui/UpdateApp.tsx — Ink-based update flow with ProgressBar + Spinner.
// Runs pre-ALT_ON (normal terminal), no harness needed.

import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { ConfirmInput, Spinner, ProgressBar, StatusMessage } from "@inkjs/ui";
import { spawn } from "node:child_process";

type UpdateInstallCommand = { bin: string; args: string[] };

export type UpdateAppProps = {
  currentVersion: string;
  latestVersion: string;
  detectInstallCommand: () => UpdateInstallCommand | null;
  restartAfterUpdate: () => boolean;
  readHighestPercent: (text: string) => number | null;
  onDone: (result: "skipped" | "updated" | "failed") => void;
};

type Phase = "confirm" | "installing" | "done";

export function UpdateApp({
  currentVersion,
  latestVersion,
  detectInstallCommand,
  restartAfterUpdate,
  readHighestPercent,
  onDone,
}: UpdateAppProps) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (phase !== "installing") return;

    const command = detectInstallCommand();
    if (!command) {
      setError("No supported package manager found (npm or bun).");
      setPhase("done");
      return;
    }

    let done = false;
    let currentProgress = 0;

    const child = spawn(command.bin, command.args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) => !k.toLowerCase().startsWith("npm_"),
        ),
      ),
    });

    const fallback = setInterval(() => {
      if (currentProgress < 95) {
        currentProgress = Math.min(currentProgress + 1, 95);
        setProgress(currentProgress);
      }
    }, 120);

    const onChunk = (chunk: Buffer) => {
      const highest = readHighestPercent(String(chunk));
      if (highest != null) {
        const next = Math.min(highest, 99);
        if (next > currentProgress) {
          currentProgress = next;
          setProgress(currentProgress);
        }
      }
    };

    child.stdout?.on("data", onChunk);
    child.stderr?.on("data", onChunk);

    function finish(ok: boolean) {
      if (done) return;
      done = true;
      clearInterval(fallback);
      if (ok) {
        setProgress(100);
        setPhase("done");
      } else {
        setError("Update command failed.");
        setPhase("done");
      }
    }

    child.on("error", () => finish(false));
    child.on("close", (code) => finish(code === 0));

    return () => {
      clearInterval(fallback);
    };
  }, [phase]);

  // After done phase renders, trigger callback
  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => {
      if (!error && progress >= 100) {
        restartAfterUpdate();
        onDone("updated");
      } else {
        onDone(error ? "failed" : "skipped");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, error]);

  if (phase === "confirm") {
    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Text>
          <Text color="yellow">Update available: </Text>
          <Text dimColor>{currentVersion}</Text>
          <Text> → </Text>
          <Text color="green" bold>{latestVersion}</Text>
        </Text>
        <Box marginTop={1}>
          <Text>Update now? </Text>
          <ConfirmInput
            defaultChoice="cancel"
            onConfirm={() => setPhase("installing")}
            onCancel={() => onDone("skipped")}
          />
        </Box>
      </Box>
    );
  }

  if (phase === "installing") {
    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Spinner label="Updating frouter-cli…" />
        <Box marginTop={1}>
          <Text>  </Text>
          <ProgressBar value={progress} />
          <Text> {progress}%</Text>
        </Box>
      </Box>
    );
  }

  // phase === "done"
  return (
    <Box flexDirection="column" paddingLeft={1}>
      {error ? (
        <StatusMessage variant="error">{error}</StatusMessage>
      ) : (
        <StatusMessage variant="success">
          Updated to {latestVersion}. Restarting…
        </StatusMessage>
      )}
    </Box>
  );
}
