'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  createSelectedFaceGeometry,
  editableMeshToBufferGeometry,
  getFaceVertexIndices,
  getSelectionCenter,
  translateMeshVertices,
} from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useSceneStore } from '@/store/sceneStore';
import { cloneEditableMesh, type EditableMesh, type SceneObject } from '@/store/types';

type MeshEditOverlayProps = {
  object: SceneObject;
};

type DragState = {
  start: THREE.Vector3;
  mesh: EditableMesh;
  vertexIndices: number[];
};

const vertexHandleGeometry = new THREE.SphereGeometry(0.045, 12, 8);
const faceHandleGeometry = new THREE.SphereGeometry(0.055, 12, 8);

export default function MeshEditOverlay({ object }: MeshEditOverlayProps) {
  const mesh = object.editableMesh;
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectionMode = useEditorStore((state) => state.meshSelectionMode);
  const selectedVertexIndices = useEditorStore((state) => state.selectedVertexIndices);
  const selectedFaceIndex = useEditorStore((state) => state.selectedFaceIndex);
  const snapping = useEditorStore((state) => state.snapping);
  const snapStep = useEditorStore((state) => state.snapStep);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const toggleVertexSelection = useEditorStore((state) => state.toggleVertexSelection);
  const setSelectedFace = useEditorStore((state) => state.setSelectedFace);
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const pivotRef = useRef<THREE.Group | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [pivotObject, setPivotObject] = useState<THREE.Group | null>(null);

  const selectedIndices = useMemo(() => {
    if (!mesh) return [];
    if (selectionMode === 'face' && selectedFaceIndex !== null) {
      return getFaceVertexIndices(mesh, selectedFaceIndex);
    }

    return selectedVertexIndices.filter((index) => index >= 0 && index < mesh.vertices.length);
  }, [mesh, selectedFaceIndex, selectedVertexIndices, selectionMode]);

  const geometry = useMemo(() => (mesh ? editableMeshToBufferGeometry(mesh) : null), [mesh]);
  const edgesGeometry = useMemo(() => (geometry ? new THREE.EdgesGeometry(geometry, 1) : null), [geometry]);
  const selectedFaceGeometry = useMemo(
    () => (mesh && selectedFaceIndex !== null ? createSelectedFaceGeometry(mesh, selectedFaceIndex) : null),
    [mesh, selectedFaceIndex],
  );

  useEffect(
    () => () => {
      geometry?.dispose();
      edgesGeometry?.dispose();
      selectedFaceGeometry?.dispose();
    },
    [edgesGeometry, geometry, selectedFaceGeometry],
  );

  const setPivotRef = useCallback((node: THREE.Group | null) => {
    pivotRef.current = node;
    setPivotObject(node);
  }, []);

  useEffect(() => {
    if (!mesh || !pivotRef.current || selectedIndices.length === 0 || dragRef.current) return;
    pivotRef.current.position.copy(getSelectionCenter(mesh, selectedIndices));
  }, [mesh, selectedIndices]);

  const startDrag = () => {
    if (!mesh || selectedIndices.length === 0 || !pivotRef.current) return;
    pushSnapshot();
    dragRef.current = {
      start: pivotRef.current.position.clone(),
      mesh: cloneEditableMesh(mesh),
      vertexIndices: selectedIndices,
    };
  };

  const updateDrag = () => {
    if (!pivotRef.current || !dragRef.current) return;

    const delta = pivotRef.current.position.clone().sub(dragRef.current.start);
    updateObject(object.uuid, {
      editableMesh: translateMeshVertices(dragRef.current.mesh, dragRef.current.vertexIndices, delta),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  if (!mesh || activeTool !== 'edit' || selectedObjectId !== object.uuid) return null;

  const faceCount = Math.floor(mesh.indices.length / 3);

  return (
    <>
      {edgesGeometry && (
        <lineSegments geometry={edgesGeometry} renderOrder={20}>
          <lineBasicMaterial color="#5eead4" transparent opacity={0.45} depthTest={false} />
        </lineSegments>
      )}

      {selectedFaceGeometry && (
        <mesh geometry={selectedFaceGeometry} renderOrder={21}>
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.28} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {selectionMode === 'vertex' &&
        mesh.vertices.map((vertex, index) => {
          const selected = selectedVertexIndices.includes(index);

          return (
            <mesh
              key={`vertex-${index}`}
              geometry={vertexHandleGeometry}
              position={vertex}
              renderOrder={30}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedObject(object.uuid);
                toggleVertexSelection(index, event.nativeEvent.shiftKey);
              }}
            >
              <meshBasicMaterial color={selected ? '#fbbf24' : '#e5e7eb'} depthTest={false} />
            </mesh>
          );
        })}

      {selectionMode === 'face' &&
        Array.from({ length: faceCount }, (_, faceIndex) => {
          const faceVertices = getFaceVertexIndices(mesh, faceIndex);
          const center = getSelectionCenter(mesh, faceVertices);
          const selected = selectedFaceIndex === faceIndex;

          return (
            <mesh
              key={`face-${faceIndex}`}
              geometry={faceHandleGeometry}
              position={center}
              renderOrder={30}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedObject(object.uuid);
                setSelectedFace(faceIndex, faceVertices);
              }}
            >
              <meshBasicMaterial color={selected ? '#fbbf24' : '#38bdf8'} depthTest={false} />
            </mesh>
          );
        })}

      <group ref={setPivotRef} visible={false} />
      {pivotObject && selectedIndices.length > 0 && (
        <TransformControls
          object={pivotObject}
          mode="translate"
          translationSnap={snapping ? snapStep : null}
          onMouseDown={startDrag}
          onObjectChange={updateDrag}
          onMouseUp={endDrag}
        />
      )}
    </>
  );
}
