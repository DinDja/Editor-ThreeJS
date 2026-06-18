'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEditorStore } from '@/store/editorStore';
import { useSceneStore } from '@/store/sceneStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { editableMeshToPolygonMesh, polygonMeshToEditableMesh, addVertex, addFace } from '@/lib/polygonMesh';
import type { Vec3 } from '@/store/types';

const CLOSE_THRESHOLD = 0.08;
const GRID_PLANE_SIZE = 200;

type DrawPolygonOverlayProps = {
  objectUuid: string;
};

export default function DrawPolygonOverlay({ objectUuid }: DrawPolygonOverlayProps) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const drawPolygonPoints = useEditorStore((state) => state.drawPolygonPoints);
  const addDrawPolygonPoint = useEditorStore((state) => state.addDrawPolygonPoint);
  const clearDrawPolygon = useEditorStore((state) => state.clearDrawPolygon);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const setMeshEditMode = useEditorStore((state) => state.setMeshEditMode);

  const updateObject = useSceneStore((state) => state.updateObject);
  const addObject = useSceneStore((state) => state.addObject);
  const meshObjects = useSceneStore((state) => state.objects);
  const createMaterialForObject = useMaterialStore((state) => state.createMaterialForObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const { camera, raycaster } = useThree();
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const targetMesh = useMemo(
    () => meshObjects.find((o) => o.uuid === objectUuid && o.editableMesh),
    [meshObjects, objectUuid],
  );

  const isActive = activeTool === 'drawPolygon';

  const closeFace = (points: Vec3[]) => {
    if (points.length < 3) return;

    pushSnapshot();

    if (targetMesh && targetMesh.editableMesh) {
      const polyMesh = editableMeshToPolygonMesh(targetMesh.editableMesh);
      const newVertexIds = points.map((p) => addVertex(polyMesh, p));
      addFace(polyMesh, newVertexIds);
      const updatedEditable = polygonMeshToEditableMesh(polyMesh);
      updateObject(targetMesh.uuid, { editableMesh: updatedEditable });
    } else {
      const newObject = addObject({
        name: `Polygon ${Date.now().toString(36).slice(-4)}`,
        kind: 'mesh',
        position: [0, 0, 0],
      });
      createMaterialForObject(newObject.uuid, newObject.materialId, `Material ${newObject.name}`);
      const polyMesh = editableMeshToPolygonMesh({ vertices: [], indices: [] });
      const newVertexIds = points.map((p) => addVertex(polyMesh, p));
      addFace(polyMesh, newVertexIds);
      const editable = polygonMeshToEditableMesh(polyMesh);
      updateObject(newObject.uuid, { editableMesh: editable });
      setSelectedObject(newObject.uuid);
    }

    clearDrawPolygon();
    setActiveTool('edit');
    setMeshEditMode('edit');
  };

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearDrawPolygon();
        setActiveTool('edit');
      } else if (e.key === 'Enter' && drawPolygonPoints.length >= 3) {
        closeFace(drawPolygonPoints);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, drawPolygonPoints, clearDrawPolygon, setActiveTool, closeFace]);

  const linePoints = useMemo(() => {
    if (!isActive) return [];
    const pts = drawPolygonPoints.map((p) => new THREE.Vector3(...p));
    if (hoverPoint && pts.length > 0) pts.push(hoverPoint);
    return pts;
  }, [drawPolygonPoints, hoverPoint, isActive]);

  const lineGeometry = useMemo(() => {
    if (linePoints.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  const closeHint = useMemo(() => {
    if (drawPolygonPoints.length < 3 || !hoverPoint) return false;
    const first = new THREE.Vector3(...drawPolygonPoints[0]);
    return first.distanceTo(hoverPoint) < CLOSE_THRESHOLD;
  }, [drawPolygonPoints, hoverPoint]);

  if (!isActive) return null;

  const getWorldPoint = (event: ThreeEvent<PointerEvent>): THREE.Vector3 | null => {
    raycaster.setFromCamera(event.pointer, camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersection);
    if (!hit) return null;
    return intersection;
  };

  const handleClick = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const point = getWorldPoint(event);
    if (!point) return;

    if (drawPolygonPoints.length >= 3) {
      const first = new THREE.Vector3(...drawPolygonPoints[0]);
      if (first.distanceTo(point) < CLOSE_THRESHOLD) {
        closeFace(drawPolygonPoints);
        return;
      }
    }

    addDrawPolygonPoint([point.x, point.y, point.z]);
  };

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    const point = getWorldPoint(event);
    if (point) setHoverPoint(point);
  };

  const handleRightClick = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (drawPolygonPoints.length >= 3) {
      closeFace(drawPolygonPoints);
    } else {
      clearDrawPolygon();
    }
  };

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        visible={false}
        onPointerMove={handleMove}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        <planeGeometry args={[GRID_PLANE_SIZE, GRID_PLANE_SIZE]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {lineGeometry && (
        <line>
          <primitive object={lineGeometry} attach="geometry" />
          <lineBasicMaterial color={closeHint ? '#34d399' : '#fbbf24'} linewidth={2} />
        </line>
      )}

      {drawPolygonPoints.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color={i === 0 && closeHint ? '#34d399' : '#fbbf24'} />
        </mesh>
      ))}

      {hoverPoint && (
        <mesh position={[hoverPoint.x, hoverPoint.y, hoverPoint.z]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
