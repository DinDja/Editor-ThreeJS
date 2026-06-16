'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import Canvas3D from './Canvas3D';
import EditorShortcuts from './EditorShortcuts';
import Properties from './Properties';
import SceneGraph from './SceneGraph';
import Timeline from './Timeline';
import Toolbar from './Toolbar';
import TutorialSpotlight from './TutorialSpotlight';
import { useState } from 'react';

export default function Editor3D() {
  const sceneRootRef = useRef<THREE.Group | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <main className="flex h-[100dvh] min-h-0 w-screen flex-col overflow-hidden bg-[#0d0f10] text-neutral-100">
      <EditorShortcuts />
      <Toolbar sceneRootRef={sceneRootRef} onOpenTutorial={() => setTutorialOpen(true)} />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_360px] max-xl:grid-cols-[240px_minmax(0,1fr)_330px] max-lg:grid-cols-1 max-lg:grid-rows-[minmax(150px,20dvh)_minmax(320px,1fr)_minmax(300px,34dvh)] max-sm:grid-rows-[minmax(132px,18dvh)_minmax(300px,1fr)_minmax(280px,34dvh)]">
        <div data-tutorial="scene-graph-panel" className="min-h-0">
          <SceneGraph />
        </div>
        <section data-tutorial="viewport-panel" className="min-h-0 min-w-0 border-x border-neutral-900/80 max-lg:border-x-0">
          <Canvas3D sceneRootRef={sceneRootRef} />
        </section>
        <div data-tutorial="properties-panel" className="min-h-0">
          <Properties />
        </div>
      </div>
      <div data-tutorial="timeline-panel" className="min-h-0">
        <Timeline />
      </div>
      <TutorialSpotlight open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </main>
  );
}
