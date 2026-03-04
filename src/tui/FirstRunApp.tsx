// src/tui/FirstRunApp.tsx — Ink-based first-run wizard with Select + PasswordInput.
// Runs pre-ALT_ON (normal terminal), no harness needed.

import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import { Select, PasswordInput, Spinner, StatusMessage } from "@inkjs/ui";

type ProviderMeta = {
  name: string;
  signupUrl: string;
  keyPrefix?: string;
};

export type FirstRunAppProps = {
  providers: Record<string, ProviderMeta>;
  validateKey: (pk: string, raw: string) => { ok: boolean; key?: string; reason?: string };
  openBrowser: (url: string) => void;
  onDone: (apiKeys: Record<string, string>) => void;
};

type Step = "choose" | "input" | "saving";

export function FirstRunApp({
  providers,
  validateKey,
  openBrowser,
  onDone,
}: FirstRunAppProps) {
  const pks = Object.keys(providers);
  const [providerIdx, setProviderIdx] = useState(0);
  const [step, setStep] = useState<Step>("choose");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const currentPk = pks[providerIdx];
  const currentMeta = currentPk ? providers[currentPk] : null;

  // Allow Ctrl+C to exit
  useInput((_input, key) => {
    if (key.ctrl && _input === "c") {
      onDone(apiKeys);
    }
  });

  function advanceProvider() {
    setError("");
    if (providerIdx + 1 < pks.length) {
      setProviderIdx(providerIdx + 1);
      setStep("choose");
    } else {
      setSaving(true);
      // Brief delay before completing
      setTimeout(() => onDone(apiKeys), 600);
    }
  }

  if (saving) {
    const n = Object.keys(apiKeys).length;
    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Text bold>frouter — Free Model Router</Text>
        <Box marginTop={1}>
          {n > 0 ? (
            <StatusMessage variant="success">
              {n} key(s) configured. Starting frouter…
            </StatusMessage>
          ) : (
            <StatusMessage variant="warning">
              No keys configured. You can add them later with P in the main screen.
            </StatusMessage>
          )}
        </Box>
      </Box>
    );
  }

  if (!currentMeta) {
    // Shouldn't happen, but safety
    onDone(apiKeys);
    return null;
  }

  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Text bold>frouter — Free Model Router</Text>
      <Text dimColor>Set up your API keys (step {providerIdx + 1}/{pks.length})</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text bold>{currentMeta.name}</Text>
          <Text dimColor>  Free key at: </Text>
          <Text color="cyan">{currentMeta.signupUrl}</Text>
        </Text>

        {step === "choose" && (
          <Box marginTop={1} flexDirection="column">
            <Select
              options={[
                { label: "Open browser + enter key", value: "open" },
                { label: "Enter key manually", value: "manual" },
                { label: "Skip this provider", value: "skip" },
              ]}
              onChange={(val) => {
                if (val === "open") {
                  openBrowser(currentMeta.signupUrl);
                  setStep("input");
                } else if (val === "manual") {
                  setStep("input");
                } else {
                  advanceProvider();
                }
              }}
            />
          </Box>
        )}

        {step === "input" && (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Paste your {currentMeta.name} API key (Enter to submit, Esc to skip):</Text>
            <PasswordInput
              placeholder={currentMeta.keyPrefix ? `${currentMeta.keyPrefix}...` : "paste key here"}
              onSubmit={(value) => {
                if (!value) {
                  advanceProvider();
                  return;
                }
                const checked = validateKey(currentPk, value);
                if (!checked.ok) {
                  setError(checked.reason || "Invalid key");
                  return;
                }
                setApiKeys({ ...apiKeys, [currentPk]: checked.key! });
                setError("");
                advanceProvider();
              }}
            />
            {error && (
              <StatusMessage variant="error">{error}. Try again or Esc to skip.</StatusMessage>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
