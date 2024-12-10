interface TextOperation {
  type: "insert" | "delete" | "retain";
  chars?: string;
  count?: number;
  position: number;
}

interface Delta {
  operations: TextOperation[];
  timestamp: number;
  version?: number;
}

function calculateDelta(oldContent: string, newContent: string): Delta {
  const operations: TextOperation[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  // Convert strings to arrays for easier character comparison
  const oldChars = Array.from(oldContent);
  const newChars = Array.from(newContent);

  while (oldIndex < oldChars.length || newIndex < newChars.length) {
    // Case 1: Characters are the same - retain operation
    if (
      oldIndex < oldChars.length &&
      newIndex < newChars.length &&
      oldChars[oldIndex] === newChars[newIndex]
    ) {
      let retainCount = 0;
      const startPosition = oldIndex;

      while (
        oldIndex < oldChars.length &&
        newIndex < newChars.length &&
        oldChars[oldIndex] === newChars[newIndex]
      ) {
        retainCount++;
        oldIndex++;
        newIndex++;
      }

      operations.push({
        type: "retain",
        count: retainCount,
        position: startPosition,
      });
    }

    // Case 2: Characters were deleted
    else if (oldIndex < oldChars.length) {
      let deleteCount = 0;
      const startPosition = oldIndex;
      const deletedChars: string[] = [];

      while (
        oldIndex < oldChars.length &&
        (newIndex >= newChars.length ||
          oldChars[oldIndex] !== newChars[newIndex])
      ) {
        deletedChars.push(oldChars[oldIndex] ?? "");
        deleteCount++;
        oldIndex++;
      }

      operations.push({
        type: "delete",
        chars: deletedChars.join(""),
        count: deleteCount,
        position: startPosition,
      });
    }

    // Case 3: Characters were inserted
    else if (newIndex < newChars.length) {
      let insertCount = 0;
      const startPosition = oldIndex;
      const insertedChars: string[] = [];

      while (newIndex < newChars.length) {
        insertedChars.push(newChars[newIndex] ?? "");
        insertCount++;
        newIndex++;
      }

      operations.push({
        type: "insert",
        chars: insertedChars.join(""),
        count: insertCount,
        position: startPosition,
      });
    }
  }

  return {
    operations,
    timestamp: Date.now(),
    version: generateVersion(), // You would implement this based on your versioning strategy
  };
}

function applyChanges(content: string, delta: Delta): string {
  let result = content;
  let offset = 0;

  for (const op of delta.operations) {
    const position = op.position + offset;

    switch (op.type) {
      case "insert":
        if (op.chars) {
          result =
            result.slice(0, position) + op.chars + result.slice(position);
          offset += op.chars.length;
        }
        break;

      case "delete":
        if (op.count) {
          result =
            result.slice(0, position) + result.slice(position + op.count);
          offset -= op.count;
        }
        break;

      case "retain":
        // No change needed for retain operations
        break;
    }
  }

  return result;
}

// Helper function to apply multiple deltas in sequence
function applyDeltaSequence(content: string, deltas: Delta[]): string {
  // Sort deltas by timestamp to ensure proper order
  const sortedDeltas = [...deltas].sort((a, b) => a.timestamp - b.timestamp);

  return sortedDeltas.reduce(
    (text, delta) => applyChanges(text, delta),
    content,
  );
}

// Helper function to merge overlapping operations
function mergeOperations(operations: TextOperation[]): TextOperation[] {
  const merged: TextOperation[] = [];
  let current: TextOperation | null = null;

  for (const op of operations) {
    if (!current || current.type !== op.type) {
      if (current) merged.push(current);
      current = { ...op };
    } else {
      // Merge consecutive operations of the same type
      if (current.chars && op.chars) {
        current.chars += op.chars;
      }
      if (current.count && op.count) {
        current.count += op.count;
      }
    }
  }

  if (current) merged.push(current);
  return merged;
}

// Version control helper (implement based on your needs)
function generateVersion(): number {
  return Date.now(); // Simple implementation - replace with your versioning strategy
}

export { calculateDelta, applyChanges, applyDeltaSequence, mergeOperations };
