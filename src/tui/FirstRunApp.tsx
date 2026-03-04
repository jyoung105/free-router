// src/tui/FirstRunApp.tsx — Ink-based first-run wizard with Select + PasswordInput.
// Runs pre-ALT_ON (normal terminal), no harness needed.

import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import { Select, PasswordInput, StatusMessage } from "@inkjs/ui";

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

  const hasAnyKey = Object.keys(apiKeys).length > 0;

  // Allow Ctrl+C to exit only if at least one key is configured
  useInput((_input, key) => {
    if (key.ctrl && _input === "c") {
      if (hasAnyKey) {
        onDone(apiKeys);
      } else {
        setError("At least one API key is required to use frouter.");
        setProviderIdx(0);
        setStep("choose");
      }
    }
  });

  function advanceProvider() {
    setError("");
    if (providerIdx + 1 < pks.length) {
      setProviderIdx(providerIdx + 1);
      setStep("choose");
    } else if (Object.keys(apiKeys).length === 0) {
      // No keys at all — force user to configure at least one
      setError("At least one API key is required to use frouter.");
      setProviderIdx(0);
      setStep("choose");
    } else {
      setSaving(true);
      // Brief delay before completing
      setTimeout(() => onDone(apiKeys), 600);
    }
  }

  if (saving) {
    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Text bold>frouter — Free Model Router</Text>
        <Box marginTop={1}>
          <StatusMessage variant="success">
            {Object.keys(apiKeys).length} key(s) configured. Starting frouter…
          </StatusMessage>
        </Box>
      </Box>
    );
  }

  if (!currentMeta) return null;

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
                ...(hasAnyKey
                  ? [{ label: "Skip remaining setup →", value: "done" }]
                  : []),
              ]}
              onChange={(val) => {
                if (val === "open") {
                  openBrowser(currentMeta.signupUrl);
                  setStep("input");
                } else if (val === "manual") {
                  setStep("input");
                } else if (val === "done") {
                  setSaving(true);
                  setTimeout(() => onDone(apiKeys), 600);
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
                setApiKeys({ ...apiKeys, [currentPk]: checked.key });
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
