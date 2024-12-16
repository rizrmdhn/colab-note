import { create } from "zustand";
import type { Editor } from "@tiptap/core";
import { v4 as uuidv4 } from "uuid";

// Types for our CRDT
type VectorClock = Record<string, number>;
type Position = number;

interface Operation {
  id: string;
  clientId: string;
  clock: VectorClock;
  type: "insert" | "delete";
  position: Position;
  content?: string;
  deleted?: boolean;
}

interface CRDTState {
  clientId: string;
  clock: VectorClock;
  operations: Operation[];
  editor: Editor | null;
  syncInProgress: boolean;

  // Methods for CRDT operations
  generateOperation: (
    type: Operation["type"],
    position: Position,
    content?: string,
  ) => Operation;
  integrateRemoteOperation: (operation: Operation) => void;
  incrementClock: () => void;
  compareVectorClocks: (a: VectorClock, b: VectorClock) => -1 | 0 | 1;
}

export const useCRDT = create<CRDTState>((set, get) => ({
  clientId: uuidv4(),
  clock: {},
  operations: [],
  editor: null,
  syncInProgress: false,

  incrementClock: () => {
    const { clientId, clock } = get();
    set({
      clock: {
        ...clock,
        [clientId]: (clock[clientId] ?? 0) + 1,
      },
    });
  },

  compareVectorClocks: (a: VectorClock, b: VectorClock): -1 | 0 | 1 => {
    let aGreater = false;
    let bGreater = false;

    const allClients = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const client of allClients) {
      const aValue = a[client] ?? 0;
      const bValue = b[client] ?? 0;

      if (aValue > bValue) aGreater = true;
      if (bValue > aValue) bGreater = true;
    }

    if (aGreater && !bGreater) return 1;
    if (bGreater && !aGreater) return -1;
    return 0;
  },

  generateOperation: (type, position, content?) => {
    const { clientId, clock } = get();
    get().incrementClock();

    const operation: Operation = {
      id: uuidv4(),
      clientId,
      clock: { ...clock },
      type,
      position,
      ...(content && { content }),
      deleted: false,
    };

    return operation;
  },

  integrateRemoteOperation: (remoteOp: Operation) => {
    const { operations, clock, editor, clientId } = get();
    if (!editor) return;

    // Update vector clock
    const newClock = { ...clock };
    Object.entries(remoteOp.clock).forEach(([client, time]) => {
      newClock[client] = Math.max(newClock[client] ?? 0, time);
    });

    // Sort operations to determine final position
    const sortedOps = [...operations, remoteOp].sort((a, b) => {
      // First compare vector clocks
      const clockCompare = get().compareVectorClocks(a.clock, b.clock);
      if (clockCompare !== 0) return clockCompare;

      // If concurrent, break ties deterministically
      if (a.clientId !== b.clientId)
        return a.clientId.localeCompare(b.clientId);
      return a.position - b.position;
    });

    // Apply the operation to the editor
    const { tr } = editor.state;
    let adjustedPosition = remoteOp.position;

    // Adjust position based on previous operations
    for (const op of sortedOps) {
      if (op === remoteOp) break;

      if (
        op.type === "insert" &&
        !op.deleted &&
        op.position <= adjustedPosition
      ) {
        adjustedPosition += op.content?.length ?? 0;
      }
      if (
        op.type === "delete" &&
        !op.deleted &&
        op.position < adjustedPosition
      ) {
        adjustedPosition -= 1;
      }
    }

    if (remoteOp.type === "insert" && remoteOp.content) {
      tr.insertText(remoteOp.content, adjustedPosition);
    } else if (remoteOp.type === "delete") {
      tr.delete(adjustedPosition, adjustedPosition + 1);
    }

    editor.view.dispatch(tr);

    set({
      operations: sortedOps,
      clock: newClock,
    });
  },
}));
