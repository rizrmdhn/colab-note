"use client";

import { MinimalTiptapEditor } from "@/components/minimal-tiptap";
import React, { useState } from "react";
import type { Content } from "@tiptap/react";
import { useCollaborativeYjs } from "@/lib/document";

export default function Page() {
  const [value, setValue] = useState<Content>("");
  const ydoc = useCollaborativeYjs();

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <div className="flex-ro flex h-full w-full gap-2">
        <MinimalTiptapEditor
          value={value}
          onChange={setValue}
          ydoc={ydoc}
          className="h-full w-full"
          editorContentClassName="p-5"
          output="html"
          placeholder="Type your description here..."
          autofocus={true}
          editable={true}
          editorClassName="focus:outline-none"
        />
      </div>
    </div>
  );
}
