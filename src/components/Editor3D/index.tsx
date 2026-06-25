'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Boxes, Clock, PanelRight } from 'lucide-react';
import Canvas3D from './Canvas3D';
import DataModelPanel from './DataModel/DataModelPanel';
import EditorModeBar from './EditorModeBar';
import EditorShortcuts from './EditorShortcuts';
import ExperienceProperties from './ExperienceProperties';
import ExperienceToolbar from './ExperienceToolbar';
import ExportWorkspace from './ExportWorkspace';
import ImageTo3DModal from './ImageTo3D/ImageTo3DModal';
import InteractionsWorkspace from './InteractionsWorkspace';
import PageBuilderWorkspace from './PageBuilderWorkspace';
import PreviewWorkspace from './PreviewWorkspace';
import Properties from './Properties';
import ProjectTree from './ProjectTree';
import SceneGraph from './SceneGraph';
import Timeline from './Timeline';
import Toolbar from './Toolbar';
import TutorialSpotlight from './TutorialSpotlight';
import { useProjectAutosave } from '@/lib/project-experience/useProjectAutosave';
import { useEditorStore } from '@/store/editorStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useSceneStore } from '@/store/sceneStore';
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
  const activeMode = useExperienceStore((state) => state.activeMode);
  const activeMobilePanel = useEditorStore((state) => state.activeMobilePanel);
  const setActiveMobilePanel = useEditorStore((state) => state.setActiveMobilePanel);
  const setLeftPanelCollapsed = useEditorStore((state) => state.setLeftPanelCollapsed);
  const setRightPanelCollapsed = useEditorStore((state) => state.setRightPanelCollapsed);
  const setTimelineCollapsed = useEditorStore((state) => state.setTimelineCollapsed);
  const panels = (activeMode === 'scene' ? ['scene', 'properties', 'timeline'] : ['scene', 'properties']) as MobilePanel[];

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
      {panels.map((panel) => {
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
            {panel === 'scene' && activeMode !== 'scene' ? 'Projeto' : mobilePanelLabels[panel]}
          </button>
        );
      })}
    </nav>
  );
}

function useViewportInfo() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const viewportDisplayMode = useEditorStore((s) => s.viewportDisplayMode);
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds);
  const objects = useSceneStore((s) => s.objects);
  const selectedObject = objects.find((o) => o.uuid === (selectedObjectIds[0] ?? null));
  return { activeTool, viewportDisplayMode, selectedObjectName: selectedObject?.name ?? 'Nenhum selecionado' };
}

function DesktopHUD() {
  const { activeTool, viewportDisplayMode, selectedObjectName } = useViewportInfo();
  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-800/90 bg-neutral-950/70 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-neutral-400 shadow-lg backdrop-blur">
      <span className="text-emerald-300">{activeTool}</span>
      <span className="h-3 w-px bg-neutral-700" />
      <span className="text-sky-300">{viewportDisplayMode}</span>
      <span className="h-3 w-px bg-neutral-700" />
      <span className="max-w-48 truncate">{selectedObjectName}</span>
    </div>
  );
}

function MobileHUD() {
  const { activeTool, viewportDisplayMode, selectedObjectName } = useViewportInfo();
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-neutral-800/90 bg-neutral-950/70 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-neutral-400 shadow-lg backdrop-blur">
      <span className="text-emerald-300">{activeTool}</span>
      <span className="h-3 w-px bg-neutral-700" />
      <span className="text-sky-300">{viewportDisplayMode}</span>
      <span className="h-3 w-px bg-neutral-700" />
      <span className="max-w-24 truncate">{selectedObjectName}</span>
    </div>
  );
}

function ExperienceWorkspace() {
  const activeMode = useExperienceStore((state) => state.activeMode);

  if (activeMode === 'page') return <PageBuilderWorkspace />;
  if (activeMode === 'data') return <DataModelPanel />;
  if (activeMode === 'interactions') return <InteractionsWorkspace />;
  if (activeMode === 'preview') return <PreviewWorkspace />;
  if (activeMode === 'export') return <ExportWorkspace />;
  return null;
}

function ExperienceRightPanel() {
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  return selectedObjectIds.length > 0 ? <Properties /> : <ExperienceProperties />;
}

export default function Editor3D() {
  const sceneRootRef = useRef<THREE.Group | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialScope, setTutorialScope] = useState<'scene' | 'page-system'>('scene');
  useProjectAutosave();
  const activeMode = useExperienceStore((state) => state.activeMode);
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

  const leftCol = leftPanelCollapsed ? `48px` : `min(${leftPanelWidth}px, 40vw)`;
  const rightCol = rightPanelCollapsed ? `48px` : `min(${rightPanelWidth}px, 42vw)`;

  /* Sync collapse state → activeMobilePanel on mobile */
  useEffect(() => {
    if (leftPanelCollapsed && activeMobilePanel === 'scene') setActiveMobilePanel(null);
    if (rightPanelCollapsed && activeMobilePanel === 'properties') setActiveMobilePanel(null);
  }, [leftPanelCollapsed, rightPanelCollapsed, activeMobilePanel, setActiveMobilePanel]);

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#0d0f10] text-neutral-100">
      <EditorShortcuts />
      <EditorModeBar />
      {activeMode === 'scene' ? (
        <Toolbar
          sceneRootRef={sceneRootRef}
          onOpenTutorial={() => {
            setTutorialScope('scene');
            setTutorialOpen(true);
          }}
        />
      ) : (
        <ExperienceToolbar
          onOpenTutorial={() => {
            setTutorialScope('page-system');
            setTutorialOpen(true);
          }}
        />
      )}

      {activeMode === 'scene' ? (
        <section className="relative min-h-0 flex-1 overflow-hidden">
          {/* ── Single Canvas3D fills the section ── */}
          <div className="absolute inset-0 overflow-hidden">
            <Canvas3D sceneRootRef={sceneRootRef} />
            {/* ── Viewport HUD ── */}
            <div className="hidden lg:block pointer-events-none absolute top-4 z-10" style={{ left: `calc(${leftCol} + 1rem)` }}>
              <DesktopHUD />
            </div>
            <div className="lg:hidden pointer-events-none absolute left-2 top-2 z-10">
              <MobileHUD />
            </div>
          </div>

          {/* ── Desktop: panels + timeline overlay the canvas ── */}
          <div className="hidden lg:flex flex-col absolute inset-0 pointer-events-none">
            <div className="flex min-h-0 flex-1">
              <div
                data-tutorial="scene-graph-panel"
                className="relative shrink-0 overflow-hidden pointer-events-auto"
                style={{ width: leftCol }}
              >
                <SceneGraph />
                {!leftPanelCollapsed && (
                  <ResizeHandle position="right" onDrag={handleLeftResize} />
                )}
              </div>
              <div className="flex-1 min-w-0" />
              <div
                data-tutorial="properties-panel"
                className="relative shrink-0 overflow-hidden pointer-events-auto"
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
      ) : (
        <section className="relative min-h-0 flex-1 overflow-hidden">
          {activeMode === 'data' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <ExperienceWorkspace />
            </div>
          ) : (
            <>
              <div
                className="hidden h-full min-h-0 lg:grid"
                style={{ gridTemplateColumns: `${leftCol} minmax(0, 1fr) ${rightCol}` }}
              >
                <div data-tutorial="properties-panel" className="relative min-h-0 overflow-hidden">
                  <ProjectTree />
                  {!leftPanelCollapsed && (
                    <ResizeHandle position="right" onDrag={handleLeftResize} />
                  )}
                </div>
                <div className="min-h-0 overflow-hidden">
                  <ExperienceWorkspace />
                </div>
                <div className="relative min-h-0 overflow-hidden">
                  <ExperienceRightPanel />
                  {!rightPanelCollapsed && (
                    <ResizeHandle position="left" onDrag={handleRightResize} />
                  )}
                </div>
              </div>

              <div className="h-full min-h-0 overflow-hidden lg:hidden">
                <ExperienceWorkspace />
              </div>
              {activeMobilePanel && (
                <div className="absolute bottom-0 left-0 right-0 z-40 max-h-[45dvh] overflow-auto overscroll-contain border-t border-neutral-800 bg-[#151719] lg:hidden">
                  {activeMobilePanel === 'scene' && <ProjectTree />}
                  {activeMobilePanel === 'properties' && <ExperienceRightPanel />}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <MobileTabBar />
      <TutorialSpotlight open={tutorialOpen} scope={tutorialScope} onClose={() => setTutorialOpen(false)} />
      <ImageTo3DModal />
    </main>
  );
}
