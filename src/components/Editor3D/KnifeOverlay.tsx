'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import { useEditorStore } from '@/store/editorStore';
import { useSceneStore } from '@/store/sceneStore';
import { useHistoryStore } from '@/store/historyStore';
import { editableMeshToPolygonMesh, polygonMeshToEditableMesh, knifeCut } from '@/lib/polygonMesh';

type KnifeOverlayProps = {
  objectUuid: string;
};

export default function KnifeOverlay({ objectUuid }: KnifeOverlayProps) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const knifePoints = useEditorStore((state) => state.knifePoints);
  const addKnifePoint = useEditorStore((state) => state.addKnifePoint);
  const clearKnife = useEditorStore((state) => state.clearKnife);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  const updateObject = useSceneStore((state) => state.updateObject);
  const meshObjects = useSceneStore((state) => state.objects);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  const targetMesh = useMemo(
    () => meshObjects.find((o) => o.uuid === objectUuid && o.editableMesh),
    [meshObjects, objectUuid],
  );

  const isActive = activeTool === 'knife' && Boolean(targetMesh?.editableMesh);

  const applyCut = () => {
    if (knifePoints.length < 2 || !targetMesh?.editableMesh) return;
    pushSnapshot();
    const polyMesh = editableMeshToPolygonMesh(targetMesh.editableMesh);
    for (let i = 0; i < knifePoints.length - 1; i += 1) {
      knifeCut(polyMesh, knifePoints[i], knifePoints[i + 1]);
    }
    const updated = polygonMeshToEditableMesh(polyMesh);
    updateObject(targetMesh.uuid, { editableMesh: updated });
    clearKnife();
    setActiveTool('edit');
  };

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearKnife();
        setActiveTool('edit');
      } else if (e.key === 'Enter' && knifePoints.length >= 2) {
        applyCut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, knifePoints, clearKnife, setActiveTool, applyCut]);

  const linePoints = useMemo(() => {
    if (!isActive) return [];
    const pts = knifePoints.map((p) => new THREE.Vector3(...p));
    if (hoverPoint && pts.length > 0) pts.push(hoverPoint);
    return pts;
  }, [knifePoints, hoverPoint, isActive]);

  const lineGeometry = useMemo(() => {
    if (linePoints.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  if (!isActive) return null;

  const getPointOnMesh = (event: ThreeEvent<PointerEvent>): THREE.Vector3 | null => {
    if (!event.face) return null;
    return event.point.clone();
  };

  const handleClick = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const point = getPointOnMesh(event);
    if (!point) return;
    addKnifePoint([point.x, point.y, point.z]);
  };

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    const point = getPointOnMesh(event);
    if (point) setHoverPoint(point);
  };

  const handleRightClick = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (knifePoints.length >= 2) {
      applyCut();
    } else {
      clearKnife();
      setActiveTool('edit');
    }
  };

  return (
    <group>
      <mesh visible={false} onClick={handleClick} onPointerMove={handleMove} onContextMenu={handleRightClick}>
        <boxGeometry args={[0.001, 0.001, 0.001]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {lineGeometry && (
        <line>
          <primitive object={lineGeometry} attach="geometry" />
          <lineBasicMaterial color="#ef4444" linewidth={2} />
        </line>
      )}

      {knifePoints.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      ))}

      {hoverPoint && (
        <mesh position={[hoverPoint.x, hoverPoint.y, hoverPoint.z]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
