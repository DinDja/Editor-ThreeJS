'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Boxes, Clock, PanelRight } from 'lucide-react';
import Canvas3D from './Canvas3D';
import EditorShortcuts from './EditorShortcuts';
import Properties from './Properties';
import SceneGraph from './SceneGraph';
import Timeline from './Timeline';
import Toolbar from './Toolbar';
import TutorialSpotlight from './TutorialSpotlight';
import { useEditorStore } from '@/store/editorStore';
import type { MobilePanel } from '@/store/types';

function ResizeHandle({
  onDrag,
  position,
}: {
  onDrag: (deltaX: number) => void;
  position: 'left' | 'right';
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(delta);
    },
    [onDrag],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      className={`absolute inset-y-0 z-50 w-1 cursor-col-resize ${position === 'left' ? '-right-0.5' : '-left-0.5'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="h-full w-full transition hover:bg-emerald-400/40" />
    </div>
  );
}

const mobilePanelIcons: Record<MobilePanel, typeof Boxes> = {
  scene: Boxes,
  properties: PanelRight,
  timeline: Clock,
};

const mobilePanelLabels: Record<MobilePanel, string> = {
  scene: 'Camadas',
  properties: 'Props',
  timeline: 'Timeline',
};

function MobileTabBar() {
  const activeMobilePanel = useEditorStore((state) => state.activeMobilePanel);
  const setActiveMobilePanel = useEditorStore((state) => state.setActiveMobilePanel);
  const setLeftPanelCollapsed = useEditorStore((state) => state.setLeftPanelCollapsed);
  const setRightPanelCollapsed = useEditorStore((state) => state.setRightPanelCollapsed);
  const setTimelineCollapsed = useEditorStore((state) => state.setTimelineCollapsed);

  const togglePanel = (panel: MobilePanel) => {
    if (activeMobilePanel === panel) {
      setActiveMobilePanel(null);
      if (panel === 'scene') setLeftPanelCollapsed(true);
      if (panel === 'properties') setRightPanelCollapsed(true);
      if (panel === 'timeline') setTimelineCollapsed(true);
    } else {
      setActiveMobilePanel(panel);
      if (panel === 'scene') setLeftPanelCollapsed(false);
      if (panel === 'properties') setRightPanelCollapsed(false);
      if (panel === 'timeline') setTimelineCollapsed(false);
    }
  };

  return (
    <nav className="flex shrink-0 items-center justify-around border-t border-neutral-800 bg-[#17191b] px-2 py-1 lg:hidden">
      {(Object.keys(mobilePanelIcons) as MobilePanel[]).map((panel) => {
        const Icon = mobilePanelIcons[panel];
        return (
          <button
            key={panel}
            type="button"
            onClick={() => togglePanel(panel)}
            className={`flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 rounded-md px-3 text-[10px] font-medium transition touch-manipulation ${
              activeMobilePanel === panel
                ? 'bg-emerald-400/10 text-emerald-200'
                : 'text-neutral-500 hover:text-neutral-200'
            }`}
          >
            <Icon size={18} />
            {mobilePanelLabels[panel]}
          </button>
        );
      })}
    </nav>
  );
}

export default function Editor3D() {
  const sceneRootRef = useRef<THREE.Group | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const leftPanelCollapsed = useEditorStore((state) => state.leftPanelCollapsed);
  const rightPanelCollapsed = useEditorStore((state) => state.rightPanelCollapsed);
  const leftPanelWidth = useEditorStore((state) => state.leftPanelWidth);
  const rightPanelWidth = useEditorStore((state) => state.rightPanelWidth);
  const setLeftPanelWidth = useEditorStore((state) => state.setLeftPanelWidth);
  const setRightPanelWidth = useEditorStore((state) => state.setRightPanelWidth);
  const activeMobilePanel = useEditorStore((state) => state.activeMobilePanel);
  const setActiveMobilePanel = useEditorStore((state) => state.setActiveMobilePanel);

  const handleLeftResize = useCallback(
    (delta: number) => {
      setLeftPanelWidth(leftPanelWidth + delta);
    },
    [leftPanelWidth, setLeftPanelWidth],
  );

  const handleRightResize = useCallback(
    (delta: number) => {
      setRightPanelWidth(rightPanelWidth - delta);
    },
    [rightPanelWidth, setRightPanelWidth],
  );

  const leftCol = leftPanelCollapsed ? `48px` : `${leftPanelWidth}px`;
  const rightCol = rightPanelCollapsed ? `48px` : `${rightPanelWidth}px`;

  /* Sync collapse state → activeMobilePanel on mobile */
  useEffect(() => {
    if (leftPanelCollapsed && activeMobilePanel === 'scene') setActiveMobilePanel(null);
    if (rightPanelCollapsed && activeMobilePanel === 'properties') setActiveMobilePanel(null);
  }, [leftPanelCollapsed, rightPanelCollapsed, activeMobilePanel, setActiveMobilePanel]);

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#0d0f10] text-neutral-100">
      <EditorShortcuts />
      <Toolbar sceneRootRef={sceneRootRef} onOpenTutorial={() => setTutorialOpen(true)} />

      <section className="relative min-h-0 flex-1 overflow-hidden">
        {/* ── Single Canvas3D fills the section ── */}
        <div className="absolute inset-0 overflow-hidden">
          <Canvas3D sceneRootRef={sceneRootRef} />
        </div>

        {/* ── Desktop: panels + timeline overlay the canvas ── */}
        <div className="hidden lg:flex flex-col absolute inset-0 pointer-events-none">
          <div className="flex min-h-0 flex-1 pointer-events-auto">
            <div
              data-tutorial="scene-graph-panel"
              className="relative shrink-0 overflow-hidden"
              style={{ width: leftCol }}
            >
              <SceneGraph />
              {!leftPanelCollapsed && (
                <ResizeHandle position="right" onDrag={handleLeftResize} />
              )}
            </div>
            <div className="flex-1 min-w-0 relative" />
            <div
              data-tutorial="properties-panel"
              className="relative shrink-0 overflow-hidden"
              style={{ width: rightCol }}
            >
              <Properties />
            </div>
          </div>
          <div className="pointer-events-auto">
            <Timeline />
          </div>
        </div>

        {/* ── Mobile: panel overlay ── */}
        {activeMobilePanel && (
          <div className="absolute bottom-0 left-0 right-0 z-40 max-h-[45dvh] overflow-auto overscroll-contain border-t border-neutral-800 bg-[#151719] lg:hidden">
            {activeMobilePanel === 'scene' && <SceneGraph />}
            {activeMobilePanel === 'properties' && <Properties />}
            {activeMobilePanel === 'timeline' && <Timeline />}
          </div>
        )}
      </section>

      <MobileTabBar />
      <TutorialSpotlight open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </main>
  );
}
