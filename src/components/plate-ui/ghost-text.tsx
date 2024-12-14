"use client";

import React from "react";

import type { CopilotPluginConfig } from "@udecode/plate-ai/react";

import { useEditorPlugin, useElement } from "@udecode/plate-common/react";

export const GhostText = () => {
  const { useOption } = useEditorPlugin<CopilotPluginConfig>({
    key: "copilot",
  });
  const element = useElement();

  // eslint-disable-next-line react-compiler/react-compiler
  const isSuggested = useOption("isSuggested", element.id as string);

  if (!isSuggested) return null;

  return <GhostTextContent />;
};

export function GhostTextContent() {
  const { useOption } = useEditorPlugin<CopilotPluginConfig>({
    key: "copilot",
  });

  // eslint-disable-next-line react-compiler/react-compiler
  const suggestionText = useOption("suggestionText");

  return (
    <span
      className="max-sm:hidden pointer-events-none text-muted-foreground/70"
      contentEditable={false}
    >
      {suggestionText && suggestionText}
    </span>
  );
}
