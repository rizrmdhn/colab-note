// hooks/useCollaborativeYjs.ts
import { api } from "@/trpc/react";
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

export function useCollaborativeYjs() {
  const [ydoc] = useState(() => new Y.Doc());
  const broadcastUpdateMutation =
    api.collaboration.broadcastUpdate.useMutation();

  // Keep track of state vector for comparison
  const stateVectorRef = useRef<Uint8Array>(Y.encodeStateVector(ydoc));

  // Subscribe to remote updates
  api.collaboration.onUpdate.useSubscription(undefined, {
    onData: (data) => {
      // Compare incoming update with current state
      const diff = Y.diffUpdate(data.update, stateVectorRef.current);

      if (diff.length === 0) {
        console.log("No new changes in update");
        return;
      }

      // Apply update and update state vector
      Y.applyUpdate(ydoc, data.update);
      stateVectorRef.current = Y.encodeStateVector(ydoc);
    },
  });

  useEffect(() => {
    const updateHandler = (update: Uint8Array) => {
      // Update state vector and broadcast
      stateVectorRef.current = Y.encodeStateVector(ydoc);
      broadcastUpdateMutation.mutate(update);
    };

    ydoc.on("update", updateHandler);

    return () => {
      ydoc.off("update", updateHandler);
      ydoc.destroy();
    };
  }, [broadcastUpdateMutation, ydoc]);

  return ydoc;
}
