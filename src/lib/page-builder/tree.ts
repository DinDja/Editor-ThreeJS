import type { BreakpointDef, ComponentDefinition, ComponentOverride, PageDocument, PageNode, PageNodeType, ResponsiveSettings } from './types';

export type PageDiffStatus = 'unchanged' | 'added' | 'removed' | 'modified';

export type PageDiffNode = {
  id: string;
  name: string;
  type: PageNodeType;
  status: PageDiffStatus;
  changes: string[];
  children: PageDiffNode[];
};

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

export const findParentPageNode = (nodes: PageNode[], id: string | null): PageNode | null => {
  if (!id) return null;
  for (const node of nodes) {
    if (node.children?.some((child) => child.id === id)) return node;
    const found = findParentPageNode(node.children ?? [], id);
    if (found) return found;
  }
  return null;
};

export type PageNodeLocation = {
  node: PageNode;
  parentId: string | null;
  index: number;
  siblingCount: number;
};

export const findPageNodeLocation = (
  nodes: PageNode[],
  id: string | null,
  parentId: string | null = null,
): PageNodeLocation | null => {
  if (!id) return null;
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === id) {
      return {
        node,
        parentId,
        index,
        siblingCount: nodes.length,
      };
    }
    const child = findPageNodeLocation(node.children ?? [], id, node.id);
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
  styles: Object.fromEntries(
    Object.entries(node.styles).map(([key, value]) => [key, value ? { ...value } : undefined]),
  ) as PageNode['styles'],
  pseudo: node.pseudo
    ? Object.fromEntries(
        Object.entries(node.pseudo).map(([pseudoClass, bpStyles]) => [
          pseudoClass,
          bpStyles
            ? Object.fromEntries(
                Object.entries(bpStyles).map(([bp, style]) => [bp, style ? { ...style } : undefined]),
              )
            : undefined,
        ]),
      )
    : undefined,
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

const insertNodeIntoTree = (
  nodes: PageNode[],
  parentId: string | null,
  nodeToInsert: PageNode,
  index?: number,
): PageNode[] => {
  if (!parentId) {
    const nextNodes = [...nodes];
    const insertIndex = typeof index === 'number' ? Math.max(0, Math.min(index, nextNodes.length)) : nextNodes.length;
    nextNodes.splice(insertIndex, 0, nodeToInsert);
    return nextNodes;
  }

  return updatePageNodeTree(nodes, parentId, (node) => {
    const children = [...(node.children ?? [])];
    const insertIndex = typeof index === 'number' ? Math.max(0, Math.min(index, children.length)) : children.length;
    children.splice(insertIndex, 0, nodeToInsert);
    return { ...node, children };
  });
};

export const insertPageNodeTree = insertNodeIntoTree;

const LEAF_TYPES: PageNodeType[] = ['text', 'button', 'image', 'video', 'sceneCanvas', 'input', 'select', 'textarea', 'label', 'menuitem'];

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
  const originalLocation = findPageNodeLocation(nodes, id);
  const original = originalLocation?.node ?? null;
  const isDescendant = (parent: PageNode, targetId: string): boolean => {
    if (parent.id === targetId) return true;
    return Boolean(parent.children?.some((child) => isDescendant(child, targetId)));
  };

  if (original && newParentId && isDescendant(original, newParentId)) return nodes;

  const { nodes: afterRemoval, removed } = removeNodeFromTree(nodes, id);
  if (!removed) return nodes;

  if (newParentId && removed.id === newParentId) return nodes;
  if (newParentId) {
    const parent = findPageNode(afterRemoval, newParentId);
    if (!parent) return nodes;
    if (!canNestPageNode(parent, removed.type)) return nodes;
  }

  const sameParent = originalLocation?.parentId === newParentId;
  const adjustedIndex = sameParent && typeof index === 'number' && index > originalLocation.index
    ? index - 1
    : index;

  return insertNodeIntoTree(afterRemoval, newParentId, removed, adjustedIndex);
};

export const isOldResponsiveFormat = (value: unknown): value is Record<string, number> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const migrateResponsiveSettings = (value: unknown): ResponsiveSettings => {
  if (Array.isArray(value)) return value as ResponsiveSettings;
  if (isOldResponsiveFormat(value)) {
    const bp: BreakpointDef[] = [];
    const old = value as Record<string, number>;
    if (typeof old.desktop === 'number') bp.push({ name: 'desktop', width: old.desktop });
    if (typeof old.tablet === 'number') bp.push({ name: 'tablet', width: old.tablet });
    if (typeof old.mobile === 'number') bp.push({ name: 'mobile', width: old.mobile });
    if (bp.length === 0) bp.push({ name: 'desktop', width: 1280 });
    return bp;
  }
  return [
    { name: 'desktop', width: 1280 },
    { name: 'tablet', width: 820 },
    { name: 'mobile', width: 390 },
  ];
};

export const getActiveBreakpoint = (responsive: ResponsiveSettings, viewportWidth: number): string => {
  const sorted = [...responsive].sort((a, b) => b.width - a.width);
  for (const bp of sorted) {
    if (viewportWidth <= bp.width) return bp.name;
  }
  return 'base';
};

/** Find all nodes with componentId in the tree */
export const findComponentInstances = (nodes: PageNode[]): PageNode[] => {
  const result: PageNode[] = [];
  const walk = (list: PageNode[]) => {
    for (const node of list) {
      if (node.componentId) result.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return result;
};

/** Deep-clone definition nodes onto an instance node's children, preserving overrides */
export const syncComponentInstance = (
  instance: PageNode,
  definition: ComponentDefinition,
): PageNode => {
  const clonedChildren = definition.nodes.map((defNode) => deepCloneWithOverrides(defNode, instance.instanceOverrides ?? {}));
  return { ...instance, children: clonedChildren };
};

/** Remove componentId and instanceOverrides from a node and its subtree, keeping current children as-is */
export const detachComponentInstance = (node: PageNode): PageNode => {
  const walk = (n: PageNode): PageNode => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { componentId, instanceOverrides, ...rest } = n;
    return {
      ...rest,
      children: rest.children?.map((child) => walk(child)),
    };
  };
  return walk(node);
};

const deepCloneWithOverrides = (
  node: PageNode,
  overrides: Record<string, ComponentOverride>,
  makeId = (): string => `comp-${Math.random().toString(36).slice(2, 10)}`,
): PageNode => {
  const newId = makeId();
  const override = overrides[node.id];
  return {
    ...node,
    id: newId,
    props: override?.props ? { ...node.props, ...override.props } : { ...node.props },
    styles: override?.styles
      ? mergeResponsiveStyles(node.styles, override.styles)
      : (Object.fromEntries(
          Object.entries(node.styles).map(([key, value]) => [key, value ? { ...value } : undefined]),
        ) as PageNode['styles']),
    children: node.children?.map((child) => deepCloneWithOverrides(child, overrides, makeId)),
  };
};

const mergeResponsiveStyles = (base: PageNode['styles'], override: PageNode['styles']): PageNode['styles'] => {
  const allKeys = new Set([...Object.keys(base), ...Object.keys(override)]);
  const merged: PageNode['styles'] = {} as PageNode['styles'];
  for (const key of allKeys) {
    merged[key] = { ...(base[key] ?? {}), ...(override[key] ?? {}) } as PageNode['styles'][typeof key];
  }
  return merged;
};

const describeStyleChanges = (a: PageNode['styles'], b: PageNode['styles']): string[] => {
  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    if (key === 'base') {
      const subA = a.base ?? {};
      const subB = b.base ?? {};
      for (const prop of Object.keys({ ...subA, ...subB })) {
        const va = JSON.stringify((subA as Record<string, unknown>)[prop]);
        const vb = JSON.stringify((subB as Record<string, unknown>)[prop]);
        if (va !== vb) changes.push(`style.${prop}: ${va} → ${vb}`);
      }
    }
  }
  return changes;
};

const compareNodes = (a: PageNode | undefined, b: PageNode | undefined): PageDiffNode => {
  const changes: string[] = [];
  if (a && b) {
    if (a.name !== b.name) changes.push(`nome: "${a.name}" → "${b.name}"`);
    if (a.type !== b.type) changes.push(`tipo: ${a.type} → ${b.type}`);
    if (JSON.stringify(a.props) !== JSON.stringify(b.props)) changes.push('props alterados');
    const styleChanges = describeStyleChanges(a.styles, b.styles);
    changes.push(...styleChanges);
  }
  const status: PageDiffStatus = !a ? 'added' : !b ? 'removed' : changes.length > 0 ? 'modified' : 'unchanged';
  const node = b ?? a!;
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    status,
    changes,
    children: [],
  };
};

const buildMap = (nodes: PageNode[]): Map<string, PageNode> => {
  const map = new Map<string, PageNode>();
  const walk = (list: PageNode[]) => {
    for (const n of list) {
      map.set(n.id, n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return map;
};

export const comparePageDocuments = (oldDoc: PageDocument, newDoc: PageDocument): PageDiffNode[] => {
  const oldMap = buildMap(oldDoc.children);
  const newMap = buildMap(newDoc.children);

  const rootIdsAdded = new Set(newDoc.children.map((n) => n.id));
  const rootIdsRemoved = new Set(oldDoc.children.map((n) => n.id));
  const rootIds = new Set([...rootIdsAdded, ...rootIdsRemoved]);

  const nodeCache = new Map<string, PageDiffNode>();

  const resolveNode = (id: string): PageDiffNode => {
    if (nodeCache.has(id)) return nodeCache.get(id)!;
    const oldNode = oldMap.get(id);
    const newNode = newMap.get(id);
    const diff = compareNodes(oldNode, newNode);
    nodeCache.set(id, diff);

    const oldChildren = oldNode?.children ?? [];
    const newChildren = newNode?.children ?? [];
    const childIds = new Set([...oldChildren.map((c) => c.id), ...newChildren.map((c) => c.id)]);
    diff.children = [...childIds].map((cid) => resolveNode(cid));

    return diff;
  };

  return [...rootIds].map((id) => resolveNode(id));
};
