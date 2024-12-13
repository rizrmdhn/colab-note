import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook to debounce a function callback
 * @template F - The function type
 */
export function useDebouncedCallback<F extends (...args: any[]) => any>(
  callback: F,
  delay: number,
): [F, (newCallback: F) => void] {
  // Store the current callback
  const [currentCallback, setCurrentCallback] = useState<F>(() => callback);

  // Store pending arguments
  const [pendingArgs, setPendingArgs] = useState<Parameters<F> | null>(null);

  // Use ref to store timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle debounced callback execution
  useEffect(() => {
    // If there are pending arguments
    if (pendingArgs) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        // Call the current callback with pending arguments
        currentCallback(...pendingArgs);

        // Clear pending arguments and timeout
        setPendingArgs(null);
        timeoutRef.current = null;
      }, delay);

      // Cleanup function
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [pendingArgs, currentCallback, delay]);

  // Debounced call function
  const debouncedCall = useCallback((...args: Parameters<F>): void => {
    setPendingArgs(args);
  }, []);

  // Allow updating the callback with type preservation
  const setCallback = useCallback((newCallback: F) => {
    setCurrentCallback(() => newCallback);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [debouncedCall as F, setCallback];
}
