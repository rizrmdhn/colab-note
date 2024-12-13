import type { TEditor, TOperation } from "@udecode/plate-common";
import isEqual from "lodash/isEqual";

type TextOperation = TOperation & {
  type: "insert_text" | "remove_text";
  offset: number;
  text: string;
};

type BatchedOperations = {
  textOps: Map<string, TextOperation[]>; // Path string -> operations
  nodeOps: TOperation[]; // Other operations
};

export class OperationBatcher {
  private readonly batchTimeout: number;
  private pendingBatch: BatchedOperations;
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly editor: TEditor;
  private readonly onComplete: (success: boolean) => void;

  constructor(
    editor: TEditor,
    batchTimeout = 32, // Two frames at 60fps
    onComplete?: (success: boolean) => void,
  ) {
    this.editor = editor;
    this.batchTimeout = batchTimeout;
    this.onComplete = onComplete ?? (() => void 0);
    this.pendingBatch = this.createEmptyBatch();
  }

  private createEmptyBatch(): BatchedOperations {
    return {
      textOps: new Map<string, TextOperation[]>(),
      nodeOps: [],
    };
  }

  private getPathString(path: readonly number[]): string {
    return path.join(",");
  }

  // Add operations to the current batch
  addOperations(operations: readonly TOperation[]): void {
    operations.forEach((op) => {
      if (this.isTextOperation(op)) {
        const pathString = this.getPathString(op.path);
        const existingOps = this.pendingBatch.textOps.get(pathString);
        if (existingOps) {
          existingOps.push(op);
        } else {
          this.pendingBatch.textOps.set(pathString, [op]);
        }
      } else {
        this.pendingBatch.nodeOps.push(op);
      }
    });

    // Reset the timeout
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => this.flush(), this.batchTimeout);
  }

  // Type guard for text operations
  private isTextOperation(op: TOperation): op is TextOperation {
    return op.type === "insert_text" || op.type === "remove_text";
  }

  // Optimize a sequence of text operations
  private optimizeTextOperations(
    ops: readonly TextOperation[],
  ): TextOperation[] {
    if (ops.length <= 1) return [...ops];

    const firstOp = ops[0];
    if (!firstOp) return [];

    const result: TextOperation[] = [];
    let currentOp = firstOp;

    for (let i = 1; i < ops.length; i++) {
      const nextOp = ops[i];
      if (!nextOp) continue;

      // Try to merge consecutive text operations
      if (this.canMergeTextOps(currentOp, nextOp)) {
        currentOp = this.mergeTextOps(currentOp, nextOp);
      } else {
        result.push(currentOp);
        currentOp = nextOp;
      }
    }

    result.push(currentOp);
    return result;
  }

  // Check if two text operations can be merged
  private canMergeTextOps(op1: TextOperation, op2: TextOperation): boolean {
    if (op1.type !== op2.type) return false;
    if (!isEqual(op1.path, op2.path)) return false;

    if (op1.type === "insert_text" && op2.type === "insert_text") {
      return op1.offset + op1.text.length === op2.offset;
    }

    if (op1.type === "remove_text" && op2.type === "remove_text") {
      return op1.offset === op2.offset;
    }

    return false;
  }

  // Merge two compatible text operations
  private mergeTextOps(op1: TextOperation, op2: TextOperation): TextOperation {
    if (op1.type === "insert_text" && op2.type === "insert_text") {
      return {
        ...op1,
        text: op1.text + op2.text,
      };
    }

    if (op1.type === "remove_text" && op2.type === "remove_text") {
      return {
        ...op1,
        text: op1.text + op2.text,
      };
    }

    return op1;
  }

  // Flush the current batch of operations
  flush(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const batch = this.pendingBatch;
    this.pendingBatch = this.createEmptyBatch();

    try {
      // Apply node operations first
      this.editor.withoutNormalizing(() => {
        // Apply node operations
        batch.nodeOps.forEach((op) => {
          this.editor.apply(op);
        });

        // Apply optimized text operations
        batch.textOps.forEach((ops) => {
          const optimizedOps = this.optimizeTextOperations(ops);
          optimizedOps.forEach((op) => {
            this.editor.apply(op);
          });
        });
      });

      this.onComplete(true);
    } catch (error) {
      console.error("Error applying batched operations:", error);
      this.onComplete(false);
    }
  }
}
