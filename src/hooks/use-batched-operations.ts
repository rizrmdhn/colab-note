import { OperationBatcher } from "@/lib/operation-batcher";
import type { TEditor } from "@udecode/plate-common";
import { useMemo } from "react";

export const useBatchedOperations = (editor: TEditor) => {
  const batcher = useMemo(
    () =>
      new OperationBatcher(
        editor,
        32, // 32ms batch window
        (success) => {
          if (!success) {
            console.error("Failed to apply batched operations");
          }
        },
      ),
    [editor],
  );

  return batcher;
};
