'use client';

import { create } from 'zustand';
import type { PageNodeType } from '@/lib/page-builder/types';

export type PageBuilderDragPayload =
  | { kind: 'new'; type: PageNodeType }
  | { kind: 'move'; id: string };

export type DropTarget =
  | { kind: 'into'; id: string | null } // null = page root
  | { kind: 'before'; id: string }
  | { kind: 'after'; id: string };

type PageBuilderDndState = {
  payload: PageBuilderDragPayload | null;
  hover: DropTarget | null;
  beginDrag: (payload: PageBuilderDragPayload) => void;
  setHover: (target: DropTarget | null) => void;
  endDrag: () => void;
};

export const usePageBuilderDndStore = create<PageBuilderDndState>((set) => ({
  payload: null,
  hover: null,
  beginDrag: (payload) => set({ payload, hover: null }),
  setHover: (hover) => set({ hover }),
  endDrag: () => set({ payload: null, hover: null }),
}));

export const PAGE_BUILDER_DND_MIME = 'application/x-page-builder';
