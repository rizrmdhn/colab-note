import * as React from "react";
import "./styles/index.css";

import type { Content, Editor } from "@tiptap/react";
import type { UseMinimalTiptapEditorProps } from "./hooks/use-minimal-tiptap";
import { EditorContent } from "@tiptap/react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SectionOne } from "./components/section/one";
import { SectionTwo } from "./components/section/two";
import { SectionThree } from "./components/section/three";
import { SectionFour } from "./components/section/four";
import { SectionFive } from "./components/section/five";
import { LinkBubbleMenu } from "./components/bubble-menu/link-bubble-menu";
import { useMinimalTiptapEditor } from "./hooks/use-minimal-tiptap";
import { MeasuredContainer } from "./components/measured-container";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useEditorPermission } from "@/hooks/use-editor-permission";

export interface MinimalTiptapProps
  extends Omit<UseMinimalTiptapEditorProps, "onUpdate"> {
  value?: Content;
  onChange?: (value: Content) => void;
  className?: string;
  editorContentClassName?: string;
}

const Toolbar = ({ editor }: { editor: Editor }) => {
  const params = useParams();

  const { canEdit } = useEditorPermission({ noteId: params.noteId as string });

  return (
    <div
      className={cn(
        canEdit && "shrink-0 overflow-x-auto border-b border-border p-2",
      )}
    >
      {canEdit && (
        <div className="flex w-max items-center gap-px">
          <SectionOne editor={editor} activeLevels={[1, 2, 3, 4, 5, 6]} />

          <Separator orientation="vertical" className="mx-2 h-7" />

          <SectionTwo
            editor={editor}
            activeActions={[
              "bold",
              "italic",
              "underline",
              "strikethrough",
              "code",
              "clearFormatting",
            ]}
            mainActionCount={3}
          />

          <Separator orientation="vertical" className="mx-2 h-7" />

          <SectionThree editor={editor} />

          <Separator orientation="vertical" className="mx-2 h-7" />

          <SectionFour
            editor={editor}
            activeActions={["orderedList", "bulletList"]}
            mainActionCount={0}
          />

          <Separator orientation="vertical" className="mx-2 h-7" />

          <SectionFive
            editor={editor}
            activeActions={["codeBlock", "blockquote", "horizontalRule"]}
            mainActionCount={0}
          />
          <Separator orientation="vertical" className="mx-2 h-7" />

          <Link
            href={`/app/notes/${params.noteId}/collaborator/new`}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md",
              buttonVariants({
                variant: "ghost",
              }),
            )}
          >
            <Users className="size-6" />
          </Link>
        </div>
      )}
    </div>
  );
};

export const MinimalTiptapEditor = React.forwardRef<
  HTMLDivElement,
  MinimalTiptapProps
>(({ value, onChange, className, editorContentClassName, ...props }, ref) => {
  const editor = useMinimalTiptapEditor({
    value,
    onUpdate: onChange,
    ...props,
  });

  if (!editor) {
    return null;
  }

  return (
    <MeasuredContainer
      as="div"
      name="editor"
      ref={ref}
      className={cn(
        "flex h-auto min-h-72 w-full flex-col rounded-md border border-input shadow-sm focus-within:border-primary",
        className,
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className={cn("minimal-tiptap-editor", editorContentClassName)}
      />
      <LinkBubbleMenu editor={editor} />
    </MeasuredContainer>
  );
});

MinimalTiptapEditor.displayName = "MinimalTiptapEditor";

export default MinimalTiptapEditor;
