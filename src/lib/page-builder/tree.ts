import type { PageDocument, PageNode, PageNodeType } from './types';

export type PageTreeNode = {
  node: PageNode;
  depth: number;
  parentId: string | null;
};

export const walkPageNodes = (
  nodes: PageNode[],
  visitor: (node: PageNode, depth: number, parentId: string | null) => void,
  depth = 0,
  parentId: string | null = null,
) => {
  for (const node of nodes) {
    visitor(node, depth, parentId);
    if (node.children?.length) {
      walkPageNodes(node.children, visitor, depth + 1, node.id);
    }
  }
};

export const flattenPageNodes = (page: PageDocument): PageTreeNode[] => {
  const result: PageTreeNode[] = [];
  walkPageNodes(page.children, (node, depth, parentId) => result.push({ node, depth, parentId }));
  return result;
};

export const findPageNode = (nodes: PageNode[], id: string | null): PageNode | null => {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findPageNode(node.children ?? [], id);
    if (child) return child;
  }
  return null;
};

export const updatePageNodeTree = (
  nodes: PageNode[],
  id: string,
  updater: (node: PageNode) => PageNode,
): PageNode[] =>
  nodes.map((node) => {
    if (node.id === id) return updater(node);
    if (!node.children?.length) return node;
    return { ...node, children: updatePageNodeTree(node.children, id, updater) };
  });

export const appendPageNode = (nodes: PageNode[], parentId: string | null, child: PageNode): PageNode[] => {
  if (!parentId) return [...nodes, child];
  return updatePageNodeTree(nodes, parentId, (node) => ({
    ...node,
    children: [...(node.children ?? []), child],
  }));
};

export const removePageNodeTree = (nodes: PageNode[], id: string): PageNode[] =>
  nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? removePageNodeTree(node.children, id) : undefined,
    }));

export const duplicatePageNodeTree = (node: PageNode, makeId: () => string): PageNode => ({
  ...node,
  id: makeId(),
  name: `${node.name} Copy`,
  props: { ...node.props },
  styles: {
    base: { ...node.styles.base },
    tablet: node.styles.tablet ? { ...node.styles.tablet } : undefined,
    mobile: node.styles.mobile ? { ...node.styles.mobile } : undefined,
  },
  responsive: node.responsive
    ? Object.fromEntries(Object.entries(node.responsive).map(([key, value]) => [key, { ...value }]))
    : undefined,
  children: node.children?.map((child) => duplicatePageNodeTree(child, makeId)),
});

export type PageNodeMoveDirection = 'up' | 'down';

export const movePageNodeTree = (
  nodes: PageNode[],
  id: string,
  direction: PageNodeMoveDirection,
): PageNode[] => {
  const index = nodes.findIndex((node) => node.id === id);

  if (index >= 0) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) return nodes;
    const nextNodes = [...nodes];
    [nextNodes[index], nextNodes[targetIndex]] = [nextNodes[targetIndex], nextNodes[index]];
    return nextNodes;
  }

  let changed = false;
  const nextNodes = nodes.map((node) => {
    if (!node.children?.length) return node;
    const nextChildren = movePageNodeTree(node.children, id, direction);
    if (nextChildren === node.children) return node;
    changed = true;
    return { ...node, children: nextChildren };
  });

  return changed ? nextNodes : nodes;
};

const removeNodeFromTree = (nodes: PageNode[], id: string): { nodes: PageNode[]; removed: PageNode | null } => {
  let removed: PageNode | null = null;
  const walk = (list: PageNode[]): PageNode[] =>
    list
      .filter((node) => {
        if (node.id === id) {
          removed = node;
          return false;
        }
        return true;
      })
      .map((node) => (node.children ? { ...node, children: walk(node.children) } : node));
  return { nodes: walk(nodes), removed };
};

const LEAF_TYPES: PageNodeType[] = ['text', 'button', 'image', 'video', 'sceneCanvas'];

export const canNestPageNode = (parent: PageNode | null, childType: PageNodeType): boolean => {
  if (!parent) return true;
  if (LEAF_TYPES.includes(parent.type)) return false;
  if (LEAF_TYPES.includes(childType)) return true;
  return true;
};

export const reparentPageNodeTree = (
  nodes: PageNode[],
  id: string,
  newParentId: string | null,
  index?: number,
): PageNode[] => {
  if (id === newParentId) return nodes;
  const { nodes: afterRemoval, removed } = removeNodeFromTree(nodes, id);
  if (!removed) return nodes;

  const isDescendant = (parent: PageNode, targetId: string): boolean => {
    if (parent.id === targetId) return true;
    return Boolean(parent.children?.some((child) => isDescendant(child, targetId)));
  };
  if (newParentId && removed.id === newParentId) return nodes;
  if (newParentId) {
    const parent = findPageNode(afterRemoval, newParentId);
    if (!parent || isDescendant(removed, newParentId)) return nodes;
    if (!canNestPageNode(parent, removed.type)) return nodes;
  }

  if (!newParentId) {
    if (typeof index === 'number') {
      const next = [...afterRemoval];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, removed);
      return next;
    }
    return [...afterRemoval, removed];
  }

  return updatePageNodeTree(afterRemoval, newParentId, (node) => ({
    ...node,
    children: [...(node.children ?? []), removed],
  }));
};
