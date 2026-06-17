import { create } from 'zustand';

export type ContextMenuData = {
  x: number;
  y: number;
  objectId: string | null;
  visible: boolean;
};

type ContextMenuStore = {
  menu: ContextMenuData;
  show: (x: number, y: number, objectId: string | null) => void;
  hide: () => void;
};

export const useContextMenu = create<ContextMenuStore>((set) => ({
  menu: { x: 0, y: 0, objectId: null, visible: false },
  show: (x, y, objectId) => set({ menu: { x, y, objectId, visible: true } }),
  hide: () => set({ menu: { x: 0, y: 0, objectId: null, visible: false } }),
}));
