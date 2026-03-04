// src/tui/SettingsApp.tsx — Ink-based settings screen with Select + PasswordInput + Spinner.
// Uses ink-harness (runs mid-session from ALT_ON state).

import React, { useState, useCallback } from "react";
import { Text, Box, useInput } from "ink";
import { Select, PasswordInput, StatusMessage } from "@inkjs/ui";

type ProviderMeta = {
  name: string;
  testModel: string;
  chatUrl: string;
  keyPrefix?: string;
};

export type SettingsResult = {
  config: any;
};

export type SettingsAppProps = {
  config: any;
  providers: Record<string, ProviderMeta>;
  getApiKey: (config: any, pk: string) => string | null;
  validateKey: (pk: string, raw: string) => { ok: boolean; key?: string; reason?: string };
  saveConfig: (config: any) => void;
  ping: (key: string | null, model: string, url: string) => Promise<{ code: string; ms?: number }>;
  initialMode?: "navigate" | "editKey";
  onDone: (result: SettingsResult) => void;
};

type Mode = "navigate" | "editKey";

export function SettingsApp({
  config: initialConfig,
  providers,
  getApiKey,
  validateKey,
  saveConfig,
  ping,
  initialMode = "navigate",
  onDone,
}: SettingsAppProps) {
  const [config, setConfig] = useState(() => JSON.parse(JSON.stringify(initialConfig)));
  const pks = Object.keys(providers);
  const [selectedPk, setSelectedPk] = useState(pks[0] || "");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [noticeVariant, setNoticeVariant] = useState<"success" | "error" | "warning">("success");

  const currentMeta = providers[selectedPk];

  const showNotice = useCallback((msg: string, variant: "success" | "error" | "warning" = "success") => {
    setNotice(msg);
    setNoticeVariant(variant);
  }, []);

  // Global key handler
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      onDone({ config });
      return;
    }

    // ESC in editKey mode: cancel back to navigate
    if (mode === "editKey" && key.escape) {
      setMode("navigate");
      showNotice("");
      return;
    }

    if (mode !== "navigate") return;

    if (key.escape) {
      saveConfig(config);
      onDone({ config });
      return;
    }

    const lowerInput = input.toLowerCase();

    if (lowerInput === "q") {
      saveConfig(config);
      onDone({ config });
      return;
    }

    if (input === " ") {
      // Toggle provider
      const next = { ...config };
      next.providers ??= {};
      next.providers[selectedPk] ??= {};
      next.providers[selectedPk].enabled = !(next.providers[selectedPk].enabled !== false);
      setConfig(next);
      saveConfig(next);
      showNotice("");
      return;
    }

    if (lowerInput === "d") {
      // Delete key
      if (config.apiKeys?.[selectedPk]) {
        const next = { ...config };
        delete next.apiKeys[selectedPk];
        setConfig(next);
        saveConfig(next);
        showNotice(`Removed ${currentMeta.name} key`, "warning");
      }
      return;
    }

    if (lowerInput === "t") {
      // Test key
      const apiKey = getApiKey(config, selectedPk);
      setTestResults((prev) => ({ ...prev, [selectedPk]: "testing\u2026" }));
      void ping(apiKey, currentMeta.testModel, currentMeta.chatUrl).then((r) => {
        const result = r.code === "200" ? `${r.ms}ms \u2713` : `${r.code} \u2717`;
        setTestResults((prev) => ({ ...prev, [selectedPk]: result }));
      });
      return;
    }

    if (key.return) {
      setMode("editKey");
      showNotice("");
      return;
    }
  });

  const providerOptions = pks.map((pk) => {
    const meta = providers[pk];
    const enabled = config.providers?.[pk]?.enabled !== false;
    const apiKey = getApiKey(config, pk);
    const status = enabled ? "[ON]" : "[OFF]";
    const keyHint = apiKey ? `${apiKey.slice(0, 4)}****` : "(no key)";
    const testHint = testResults[pk] ? ` [${testResults[pk]}]` : "";
    return {
      label: `${status} ${meta.name}  ${keyHint}${testHint}`,
      value: pk,
    };
  });

  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Text bold inverse> frouter Settings </Text>
      <Text dimColor>{"\n"}  {"\u2191\u2193"}:navigate  Enter:edit key  Space:toggle  T:test  D:delete  ESC/Q:back</Text>

      <Box marginTop={1} flexDirection="column">
        {mode === "navigate" && (
          <Select
            options={providerOptions}
            defaultValue={selectedPk}
            onChange={(val) => setSelectedPk(val)}
          />
        )}

        {mode === "editKey" && (
          <Box flexDirection="column">
            <Text>Enter API key for <Text bold>{currentMeta.name}</Text>:</Text>
            <PasswordInput
              placeholder={currentMeta.keyPrefix ? `${currentMeta.keyPrefix}...` : "paste key here"}
              onSubmit={(value) => {
                const next = { ...config };
                next.apiKeys ??= {};
                if (value) {
                  const checked = validateKey(selectedPk, value);
                  if (!checked.ok) {
                    showNotice(`Invalid key for ${currentMeta.name}: ${checked.reason}`, "error");
                    return;
                  }
                  next.apiKeys[selectedPk] = checked.key;
                  showNotice(`Saved ${currentMeta.name} key`, "success");
                } else {
                  delete next.apiKeys[selectedPk];
                  showNotice(`Removed ${currentMeta.name} key`, "warning");
                }
                setConfig(next);
                saveConfig(next);
                setMode("navigate");
              }}
            />
            <Text dimColor>Enter to save, Esc to cancel</Text>
          </Box>
        )}
      </Box>

      {notice && (
        <Box marginTop={1}>
          <StatusMessage variant={noticeVariant}>{notice}</StatusMessage>
        </Box>
      )}
    </Box>
  );
}
