import { THROTTLE_INTERVAL, TYPING_TIMEOUT } from "@/lib/constants";
import { api } from "@/trpc/react";
import { useRef, useCallback } from "react";

export function useThrottledIsTypingMutation(friendId: string) {
  const isTyping = api.message.isTyping.useMutation();

  // Refs to persist state between renders
  const stateRef = useRef(false);
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);

  return useCallback(
    (nextState: boolean) => {
      const now = Date.now();
      const timeSinceLastTrigger = now - lastTriggerTimeRef.current;

      // Clear existing activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }

      if (nextState) {
        // User is typing
        if (!stateRef.current) {
          // Only send typing indicator if we weren't already typing
          // or if enough time has passed since last API call
          if (timeSinceLastTrigger >= THROTTLE_INTERVAL) {
            stateRef.current = true;
            isTyping.mutate({
              friendId,
              isTyping: true,
            });
            lastTriggerTimeRef.current = now;
          } else if (!throttleTimeoutRef.current) {
            // Schedule a throttled update
            throttleTimeoutRef.current = setTimeout(() => {
              if (stateRef.current) {
                isTyping.mutate({
                  friendId,
                  isTyping: true,
                });
                lastTriggerTimeRef.current = Date.now();
              }
              throttleTimeoutRef.current = null;
            }, THROTTLE_INTERVAL - timeSinceLastTrigger);
          }
        }

        // Set timeout to stop typing indicator after inactivity
        activityTimeoutRef.current = setTimeout(() => {
          if (stateRef.current) {
            stateRef.current = false;
            isTyping.mutate({
              friendId,
              isTyping: false,
            });
            lastTriggerTimeRef.current = Date.now();
          }
          activityTimeoutRef.current = null;
        }, TYPING_TIMEOUT);
      } else {
        // User explicitly stopped typing (e.g., blur event)
        if (stateRef.current) {
          stateRef.current = false;
          // Clear any pending throttled updates
          if (throttleTimeoutRef.current) {
            clearTimeout(throttleTimeoutRef.current);
            throttleTimeoutRef.current = null;
          }
          // Send stop typing immediately
          isTyping.mutate({
            friendId,
            isTyping: false,
          });
          lastTriggerTimeRef.current = now;
        }
      }
    },
    [friendId, isTyping],
  );
}
