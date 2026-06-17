'use client';

import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from './Canvas3D';
import EditorShortcuts from './EditorShortcuts';
import Properties from './Properties';
import SceneGraph from './SceneGraph';
import Timeline from './Timeline';
import Toolbar from './Toolbar';
import TutorialSpotlight from './TutorialSpotlight';
import { useEditorStore } from '@/store/editorStore';

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

export default function Editor3D() {
  const sceneRootRef = useRef<THREE.Group | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const leftPanelCollapsed = useEditorStore((state) => state.leftPanelCollapsed);
  const rightPanelCollapsed = useEditorStore((state) => state.rightPanelCollapsed);
  const leftPanelWidth = useEditorStore((state) => state.leftPanelWidth);
  const rightPanelWidth = useEditorStore((state) => state.rightPanelWidth);
  const setLeftPanelWidth = useEditorStore((state) => state.setLeftPanelWidth);
  const setRightPanelWidth = useEditorStore((state) => state.setRightPanelWidth);

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

  return (
    <main className="flex h-[100dvh] min-h-0 w-screen flex-col overflow-hidden bg-[#0d0f10] text-neutral-100">
      <EditorShortcuts />
      <Toolbar sceneRootRef={sceneRootRef} onOpenTutorial={() => setTutorialOpen(true)} />
      <div
        className="grid min-h-0 flex-1 max-lg:grid-cols-1 max-lg:grid-rows-[minmax(150px,20dvh)_minmax(320px,1fr)_minmax(300px,34dvh)] max-sm:grid-rows-[minmax(132px,18dvh)_minmax(300px,1fr)_minmax(280px,34dvh)]"
        style={{
          gridTemplateColumns: `${leftCol} minmax(200px,1fr) ${rightCol}`,
        }}
      >
        <div data-tutorial="scene-graph-panel" className="relative min-h-0">
          <SceneGraph />
          {!leftPanelCollapsed && (
            <ResizeHandle position="right" onDrag={handleLeftResize} />
          )}
        </div>
        <section
          data-tutorial="viewport-panel"
          className="relative min-h-0 min-w-0 border-x border-neutral-900/80 max-lg:border-x-0"
        >
          <Canvas3D sceneRootRef={sceneRootRef} />
          {!rightPanelCollapsed && (
            <ResizeHandle position="left" onDrag={handleRightResize} />
          )}
        </section>
        <div data-tutorial="properties-panel" className="relative min-h-0">
          <Properties />
        </div>
      </div>
      <div data-tutorial="timeline-panel" className="min-h-0 shrink-0">
        <Timeline />
      </div>
      <TutorialSpotlight open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </main>
  );
}
