import * as React from "react";
import type { Editor } from "@tiptap/react";
import type { Content, UseEditorOptions } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEditor } from "@tiptap/react";
import { Typography } from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  Link,
  Image,
  HorizontalRule,
  CodeBlockLowlight,
  Selection,
  Color,
  UnsetAllMarks,
  ResetMarksOnEnter,
  FileHandler,
} from "../extensions";
import { cn } from "@/lib/utils";
import { fileToBase64, getOutput, randomId } from "../utils";
import { useThrottle } from "../hooks/use-throttle";
import { toast } from "sonner";
import Collaboration from "@tiptap/extension-collaboration";
import type { Doc } from "yjs";
import { type ConnectedUser, useEditorStore } from "@/store/editor.store";
import type { TiptapCollabProvider } from "@hocuspocus/provider";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

export interface UseMinimalTiptapEditorProps extends UseEditorOptions {
  ydoc: Doc;
  value?: Content;
  output?: "html" | "json" | "text";
  placeholder?: string;
  editorClassName?: string;
  throttleDelay?: number;
  onUpdate?: (content: Content) => void;
  onBlur?: (content: Content) => void;
}

const createCursor = (user: ConnectedUser) => {
  const cursor = document.createElement("span");
  cursor.id = `cursor-${user.id}`;
  cursor.classList.add(
    "relative",
    "inline-block",
    "pointer-events-none",
    "z-10",
  );
  cursor.style.cssText = `
        width: 2px;
        height: 1.2em;
        background-color: ${user.color};
        margin-left: -1px;
        margin-right: -1px;
        display: inline-block;
        vertical-align: text-bottom;
    `;

  // const label = document.createElement("div");
  // label.classList.add(
  //   "absolute",
  //   "-top-6", // Changed from -top-10 to bring it closer
  //   // do not center horizontally
  //   "left-1/2",
  //   "-translate-x-1/2", // Offset by half its width
  //   "px-2",
  //   "py-0.5",
  //   "text-xs",
  //   "font-medium",
  //   "text-white",
  //   "rounded-md",
  //   "whitespace-nowrap",
  //   "select-none",
  //   "z-20",
  // );
  // label.style.backgroundColor = user.color;
  // label.textContent = user.name;

  // cursor.appendChild(label);
  return cursor;
};

const createExtensions = (
  provider: TiptapCollabProvider | null,
  placeholder: string,
  ydoc: Doc,
  connectedUser: ConnectedUser | null,
) => {
  return [
    StarterKit.configure({
      horizontalRule: false,
      codeBlock: false,
      paragraph: { HTMLAttributes: { class: "text-node" } },
      heading: { HTMLAttributes: { class: "heading-node" } },
      blockquote: { HTMLAttributes: { class: "block-node" } },
      bulletList: { HTMLAttributes: { class: "list-node" } },
      orderedList: { HTMLAttributes: { class: "list-node" } },
      code: { HTMLAttributes: { class: "inline", spellcheck: "false" } },
      dropcursor: { width: 2, class: "ProseMirror-dropcursor border" },
      history: false,
    }),
    Link,
    Underline,
    Image.configure({
      allowedMimeTypes: ["image/*"],
      maxFileSize: 5 * 1024 * 1024,
      allowBase64: true,
      uploadFn: async (file) => {
        // NOTE: This is a fake upload function. Replace this with your own upload logic.
        // This function should return the uploaded image URL.

        // wait 3s to simulate upload
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const src = await fileToBase64(file);

        // either return { id: string | number, src: string } or just src
        // return src;
        return { id: randomId(), src };
      },
      onToggle(editor, files, pos) {
        editor.commands.insertContentAt(
          pos,
          files.map((image) => {
            const blobUrl = URL.createObjectURL(image);
            const id = randomId();

            return {
              type: "image",
              attrs: {
                id,
                src: blobUrl,
                alt: image.name,
                title: image.name,
                fileName: image.name,
              },
            };
          }),
        );
      },
      onImageRemoved({ id, src }) {
        console.log("Image removed", { id, src });
      },
      onValidationError(errors) {
        errors.forEach((error) => {
          toast.error("Image validation error", {
            position: "bottom-right",
            description: error.reason,
          });
        });
      },
      onActionSuccess({ action }) {
        const mapping = {
          copyImage: "Copy Image",
          copyLink: "Copy Link",
          download: "Download",
        };
        toast.success(mapping[action], {
          position: "bottom-right",
          description: "Image action success",
        });
      },
      onActionError(error, { action }) {
        const mapping = {
          copyImage: "Copy Image",
          copyLink: "Copy Link",
          download: "Download",
        };
        toast.error(`Failed to ${mapping[action]}`, {
          position: "bottom-right",
          description: error.message,
        });
      },
    }),
    FileHandler.configure({
      allowBase64: true,
      allowedMimeTypes: ["image/*"],
      maxFileSize: 5 * 1024 * 1024,
      onDrop: (editor, files, pos) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        files.forEach(async (file) => {
          const src = await fileToBase64(file);
          editor.commands.insertContentAt(pos, {
            type: "image",
            attrs: { src },
          });
        });
      },
      onPaste: (editor, files) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        files.forEach(async (file) => {
          const src = await fileToBase64(file);
          editor.commands.insertContent({
            type: "image",
            attrs: { src },
          });
        });
      },
      onValidationError: (errors) => {
        errors.forEach((error) => {
          toast.error("Image validation error", {
            position: "bottom-right",
            description: error.reason,
          });
        });
      },
    }),
    Color,
    TextStyle,
    Selection,
    Typography,
    UnsetAllMarks,
    HorizontalRule,
    ResetMarksOnEnter,
    CodeBlockLowlight,
    Placeholder.configure({ placeholder: () => placeholder }),
    Collaboration.extend().configure({
      document: ydoc,
    }),
    CollaborationCursor.extend().configure({
      provider,
      user: {
        id: connectedUser?.id ?? randomId(),
        name: connectedUser?.name ?? "Anonymous",
        color: connectedUser?.color ?? "#000",
      },
      render(user) {
        return createCursor(user as ConnectedUser);
      },
    }),
  ];
};

export const useMinimalTiptapEditor = ({
  value,
  output = "html",
  placeholder = "",
  ydoc,
  editorClassName,
  throttleDelay = 0,
  onUpdate,
  onBlur,
  ...props
}: UseMinimalTiptapEditorProps) => {
  const setEditor = useEditorStore((state) => state.setEditor);
  const provider = useEditorStore((state) => state.provider);
  const connectedUser = useEditorStore((state) => state.users);

  const throttledSetValue = useThrottle(
    (value: Content) => onUpdate?.(value),
    throttleDelay,
  );

  const handleUpdate = React.useCallback(
    (editor: Editor) => throttledSetValue(getOutput(editor, output)),
    [output, throttledSetValue],
  );

  const handleCreate = React.useCallback(
    (editor: Editor) => {
      if (value && editor.isEmpty && provider) {
        provider.on("synced", () => {
          editor.commands.setContent("Test");
        });
      }
      setEditor(editor);
    },
    [provider, setEditor, value],
  );

  const handleBlur = React.useCallback(
    (editor: Editor) => onBlur?.(getOutput(editor, output)),
    [output, onBlur],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createExtensions(provider, placeholder, ydoc, connectedUser),
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        class: cn("focus:outline-none", editorClassName),
      },
    },
    onContentError: ({ disableCollaboration }) => {
      disableCollaboration();
    },
    onUpdate: ({ editor }) => handleUpdate(editor),
    onCreate: ({ editor }) => handleCreate(editor),
    onBlur: ({ editor }) => handleBlur(editor),
    ...props,
  });

  return editor;
};

export default useMinimalTiptapEditor;
