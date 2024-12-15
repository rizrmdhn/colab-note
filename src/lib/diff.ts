import {
  type TText,
  isElement,
  type TOperation,
  type TDescendant,
  type Value,
  type TEditor,
} from "@udecode/plate-common";
import isEqual from "lodash/isEqual";

// Helper to remove children from properties when comparing
const stripChildren = <T extends Record<string, unknown>>(
  props: T,
): Omit<T, "children"> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { children, ...rest } = props;
  return rest;
};

// Helper to check if properties are different (excluding children)
const propertiesDiffer = (
  oldProps: Record<string, unknown>,
  newProps: Record<string, unknown>,
): boolean => {
  const oldStripped = stripChildren(oldProps);
  const newStripped = stripChildren(newProps);
  return !isEqual(oldStripped, newStripped);
};

export const compareNodes = {
  getDifferences<V extends Value>(
    oldNodes: V,
    newNodes: V,
  ): readonly TOperation[] {
    const operations: TOperation[] = [];

    const compareNodesRecursive = (
      oldNode: TDescendant,
      newNode: TDescendant,
      path: readonly number[],
    ): void => {
      // Handle text nodes
      if (!isElement(oldNode) && !isElement(newNode)) {
        if (oldNode.text !== newNode.text) {
          if (oldNode.text.length > 0) {
            operations.push({
              type: "remove_text",
              path: [...path],
              offset: 0,
              text: oldNode.text,
            });
          }
          if (newNode.text.length > 0) {
            operations.push({
              type: "insert_text",
              path: [...path],
              offset: 0,
              text: newNode.text,
            });
          }
        }

        // Handle text node properties (like bold, italic) but not text content
        const oldProps = { ...oldNode } as Partial<TText>;
        const newProps = { ...newNode } as Partial<TText>;
        delete oldProps.text;
        delete newProps.text;

        if (!isEqual(oldProps, newProps)) {
          operations.push({
            type: "set_node",
            path: [...path],
            properties: oldProps,
            newProperties: newProps,
          });
        }
        return;
      }

      // Handle element nodes
      if (isElement(oldNode) && isElement(newNode)) {
        // Compare node properties excluding children
        if (propertiesDiffer(oldNode, newNode)) {
          operations.push({
            type: "set_node",
            path: [...path],
            properties: stripChildren(oldNode),
            newProperties: stripChildren(newNode),
          });
        }

        // Compare children
        const oldChildren = oldNode.children ?? [];
        const newChildren = newNode.children ?? [];

        const minLength = Math.min(oldChildren.length, newChildren.length);

        // Compare existing children
        for (let i = 0; i < minLength; i++) {
          const oldChild = oldChildren[i];
          const newChild = newChildren[i];
          if (oldChild && newChild) {
            compareNodesRecursive(oldChild, newChild, [...path, i]);
          }
        }

        // Handle added children
        for (let i = minLength; i < newChildren.length; i++) {
          const newChild = newChildren[i];
          if (newChild) {
            operations.push({
              type: "insert_node",
              path: [...path, i],
              node: newChild,
            });
          }
        }

        // Handle removed children
        for (let i = newChildren.length; i < oldChildren.length; i++) {
          const oldChild = oldChildren[i];
          if (oldChild) {
            operations.push({
              type: "remove_node",
              path: [...path, i],
              node: oldChild,
            });
          }
        }
      }
    };

    // Handle top-level nodes
    if (Array.isArray(oldNodes) && Array.isArray(newNodes)) {
      const minLength = Math.min(oldNodes.length, newNodes.length);

      for (let i = 0; i < minLength; i++) {
        const oldNode = oldNodes[i];
        const newNode = newNodes[i];
        if (oldNode && newNode) {
          compareNodesRecursive(oldNode, newNode, [i]);
        }
      }

      // Handle added top-level nodes
      for (let i = minLength; i < newNodes.length; i++) {
        const newNode = newNodes[i];
        if (newNode) {
          operations.push({
            type: "insert_node",
            path: [i],
            node: newNode,
          });
        }
      }

      // Handle removed top-level nodes
      for (let i = newNodes.length; i < oldNodes.length; i++) {
        const oldNode = oldNodes[i];
        if (oldNode) {
          operations.push({
            type: "remove_node",
            path: [i],
            node: oldNode,
          });
        }
      }
    }

    return operations;
  },

  applyOperations<V extends Value>(
    editor: TEditor<V>,
    operations: readonly TOperation[],
  ): void {
    editor.withoutNormalizing(() => {
      operations.forEach((op) => {
        try {
          editor.apply(op);
        } catch (error) {
          console.error("Error applying operation:", op, error);
        }
      });
    });
  },
};
