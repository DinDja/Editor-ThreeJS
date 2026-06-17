'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  createSelectedEdgeGeometry,
  createSelectedFaceGeometry,
  editableMeshToBufferGeometry,
  getFaceEdges,
  getFaceVertexIndices,
  getMeshEdges,
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

const vertexHandleGeometry = new THREE.SphereGeometry(0.022, 8, 6);
const selectedVertexHandleGeometry = new THREE.SphereGeometry(0.034, 10, 8);
const faceHandleGeometry = new THREE.SphereGeometry(0.032, 8, 6);
const edgeHandleGeometry = new THREE.SphereGeometry(0.026, 8, 6);
const VERTEX_HANDLE_LIMIT = 600;
const FACE_HANDLE_LIMIT = 260;
const EDGE_HANDLE_LIMIT = 420;

export default function MeshEditOverlay({ object }: MeshEditOverlayProps) {
  const mesh = object.editableMesh;
  const activeTool = useEditorStore((state) => state.activeTool);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectionMode = useEditorStore((state) => state.meshSelectionMode);
  const selectedVertexIndices = useEditorStore((state) => state.selectedVertexIndices);
  const selectedEdgeVertexIndices = useEditorStore((state) => state.selectedEdgeVertexIndices);
  const selectedFaceIndex = useEditorStore((state) => state.selectedFaceIndex);
  const sculptBrushObjectId = useEditorStore((state) => state.sculptBrushObjectId);
  const sculptBrushCenter = useEditorStore((state) => state.sculptBrushCenter);
  const sculptBrushNormal = useEditorStore((state) => state.sculptBrushNormal);
  const sculptRadius = useEditorStore((state) => state.sculptRadius);
  const snapping = useEditorStore((state) => state.snapping);
  const snapStep = useEditorStore((state) => state.snapStep);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const toggleVertexSelection = useEditorStore((state) => state.toggleVertexSelection);
  const setSelectedEdge = useEditorStore((state) => state.setSelectedEdge);
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

    if (selectionMode === 'edge' && selectedEdgeVertexIndices) {
      return selectedEdgeVertexIndices.filter((index) => index >= 0 && index < mesh.vertices.length);
    }

    return selectedVertexIndices.filter((index) => index >= 0 && index < mesh.vertices.length);
  }, [mesh, selectedEdgeVertexIndices, selectedFaceIndex, selectedVertexIndices, selectionMode]);

  const geometry = useMemo(() => (mesh ? editableMeshToBufferGeometry(mesh) : null), [mesh]);
  const edgesGeometry = useMemo(() => (geometry ? new THREE.EdgesGeometry(geometry, 1) : null), [geometry]);
  const meshEdges = useMemo(() => (mesh ? getMeshEdges(mesh) : []), [mesh]);
  const selectedEdgeGeometry = useMemo(
    () => (mesh && selectedEdgeVertexIndices ? createSelectedEdgeGeometry(mesh, selectedEdgeVertexIndices) : null),
    [mesh, selectedEdgeVertexIndices],
  );
  const selectedFaceGeometry = useMemo(
    () => (mesh && selectedFaceIndex !== null ? createSelectedFaceGeometry(mesh, selectedFaceIndex) : null),
    [mesh, selectedFaceIndex],
  );
  const brushQuaternion = useMemo(() => {
    if (!sculptBrushNormal) return new THREE.Quaternion();
    const normal = new THREE.Vector3(...sculptBrushNormal);
    if (normal.lengthSq() === 0) return new THREE.Quaternion();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.normalize());
  }, [sculptBrushNormal]);

  useEffect(
    () => () => {
      geometry?.dispose();
      edgesGeometry?.dispose();
      selectedEdgeGeometry?.dispose();
      selectedFaceGeometry?.dispose();
    },
    [edgesGeometry, geometry, selectedEdgeGeometry, selectedFaceGeometry],
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

  if (!mesh || selectedObjectId !== object.uuid || viewportDisplayMode === 'primitive') return null;

  const isEditMode = activeTool === 'edit';
  const isSculptMode = activeTool === 'sculpt';
  const canEditMesh = isEditMode || isSculptMode;
  const showEdges =
    canEditMesh || viewportDisplayMode === 'wireframe' || viewportDisplayMode === 'polygons' || viewportDisplayMode === 'vertices';
  const showVertexPoints = viewportDisplayMode === 'vertices' && !(isEditMode && selectionMode === 'vertex');
  const showVertexHandles = isEditMode && selectionMode === 'vertex';
  const showFaceHandles = isEditMode && selectionMode === 'face';
  const showEdgeHandles = isEditMode && selectionMode === 'edge';
  const showBrushPreview = Boolean(
    isSculptMode && sculptBrushObjectId === object.uuid && sculptBrushCenter && sculptBrushNormal && sculptRadius > 0,
  );

  const faceCount = Math.floor(mesh.indices.length / 3);
  const vertexCount = mesh.vertices.length;
  const showDenseVertexPoints = showVertexPoints || (showVertexHandles && vertexCount > VERTEX_HANDLE_LIMIT);

  const pickClosestVertexInFace = (faceIndex: number, point: THREE.Vector3) => {
    const vertices = getFaceVertexIndices(mesh, faceIndex);
    let closest = vertices[0] ?? null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const vertexIndex of vertices) {
      const vertex = mesh.vertices[vertexIndex];
      if (!vertex) continue;
      const distance = new THREE.Vector3(vertex[0], vertex[1], vertex[2]).distanceTo(point);
      if (distance < minDistance) {
        minDistance = distance;
        closest = vertexIndex;
      }
    }

    return closest;
  };

  const pickClosestEdgeInFace = (faceIndex: number, point: THREE.Vector3): [number, number] | null => {
    const edges = getFaceEdges(mesh, faceIndex);
    let closest: [number, number] | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const edge of edges) {
      const first = mesh.vertices[edge[0]];
      const second = mesh.vertices[edge[1]];
      if (!first || !second) continue;

      const start = new THREE.Vector3(...first);
      const end = new THREE.Vector3(...second);
      const segment = end.clone().sub(start);
      const lengthSq = segment.lengthSq();
      const t = lengthSq === 0 ? 0 : THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
      const closestPoint = start.add(segment.multiplyScalar(t));
      const distance = point.distanceTo(closestPoint);

      if (distance < minDistance) {
        minDistance = distance;
        closest = edge;
      }
    }

    return closest;
  };

  return (
    <>
      {showEdges && edgesGeometry && (
        <lineSegments geometry={edgesGeometry} renderOrder={20}>
          <lineBasicMaterial
            color={isSculptMode ? '#f8fafc' : viewportDisplayMode === 'polygons' ? '#93c5fd' : '#5eead4'}
            transparent
            opacity={viewportDisplayMode === 'wireframe' ? 0.75 : isSculptMode ? 0.35 : 0.45}
            depthTest={false}
          />
        </lineSegments>
      )}

      {isEditMode && geometry && (
        <mesh
          geometry={geometry}
          visible={false}
          onClick={(event) => {
            if (!event.face) return;
            event.stopPropagation();
            setSelectedObject(object.uuid);

            const faceIndex = event.faceIndex ?? Math.floor(event.face.a / 3);

            if (selectionMode === 'face') {
              const faceVertices = getFaceVertexIndices(mesh, faceIndex);
              setSelectedFace(faceIndex, faceVertices);
              return;
            }

            if (selectionMode === 'edge') {
              const localPoint = event.object.worldToLocal(event.point.clone());
              setSelectedEdge(pickClosestEdgeInFace(faceIndex, localPoint));
              return;
            }

            const localPoint = event.object.worldToLocal(event.point.clone());
            const closestVertex = pickClosestVertexInFace(faceIndex, localPoint);
            if (closestVertex !== null) {
              toggleVertexSelection(closestVertex, event.nativeEvent.shiftKey);
            }
          }}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {selectedEdgeGeometry && (
        <lineSegments geometry={selectedEdgeGeometry} renderOrder={24}>
          <lineBasicMaterial color="#fbbf24" transparent opacity={0.95} depthTest={false} />
        </lineSegments>
      )}

      {canEditMesh && selectedFaceGeometry && (
        <mesh geometry={selectedFaceGeometry} renderOrder={21}>
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.28} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {showDenseVertexPoints && geometry && (
        <points geometry={geometry} renderOrder={28}>
          <pointsMaterial
            color={isSculptMode ? '#c4b5fd' : '#e5e7eb'}
            size={0.035}
            sizeAttenuation
            transparent
            opacity={0.74}
            depthTest={false}
          />
        </points>
      )}

      {showVertexHandles &&
        mesh.vertices.map((vertex, index) => {
          const selected = selectedVertexIndices.includes(index);
          if (!selected && vertexCount > VERTEX_HANDLE_LIMIT) return null;

          return (
            <mesh
              key={`vertex-${index}`}
              geometry={selected ? selectedVertexHandleGeometry : vertexHandleGeometry}
              position={vertex}
              renderOrder={30}
              onClick={(event) => {
                if (!isEditMode) return;
                event.stopPropagation();
                setSelectedObject(object.uuid);
                toggleVertexSelection(index, event.nativeEvent.shiftKey);
              }}
            >
              <meshBasicMaterial
                color={selected ? '#fbbf24' : '#e5e7eb'}
                transparent
                opacity={selected ? 1 : 0.86}
                depthTest={false}
              />
            </mesh>
          );
        })}

      {showEdgeHandles &&
        meshEdges.map((edge) => {
          const first = mesh.vertices[edge.a];
          const second = mesh.vertices[edge.b];
          if (!first || !second) return null;

          const center = new THREE.Vector3(...first).add(new THREE.Vector3(...second)).multiplyScalar(0.5);
          const selected =
            selectedEdgeVertexIndices &&
            ((selectedEdgeVertexIndices[0] === edge.a && selectedEdgeVertexIndices[1] === edge.b) ||
              (selectedEdgeVertexIndices[0] === edge.b && selectedEdgeVertexIndices[1] === edge.a));
          if (!selected && meshEdges.length > EDGE_HANDLE_LIMIT) return null;

          return (
            <mesh
              key={`edge-${edge.key}`}
              geometry={edgeHandleGeometry}
              position={center}
              renderOrder={31}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedObject(object.uuid);
                setSelectedEdge([edge.a, edge.b]);
              }}
            >
              <meshBasicMaterial color={selected ? '#fbbf24' : '#67e8f9'} depthTest={false} />
            </mesh>
          );
        })}

      {showFaceHandles &&
        Array.from({ length: faceCount }, (_, faceIndex) => {
          const faceVertices = getFaceVertexIndices(mesh, faceIndex);
          const center = getSelectionCenter(mesh, faceVertices);
          const selected = selectedFaceIndex === faceIndex;
          if (!selected && faceCount > FACE_HANDLE_LIMIT) return null;

          return (
            <mesh
              key={`face-${faceIndex}`}
              geometry={faceHandleGeometry}
              position={center}
              renderOrder={30}
              onClick={(event) => {
                if (!isEditMode) return;
                event.stopPropagation();
                setSelectedObject(object.uuid);
                setSelectedFace(faceIndex, faceVertices);
              }}
            >
              <meshBasicMaterial
                color={selected ? '#fbbf24' : '#38bdf8'}
                transparent
                opacity={isEditMode ? 1 : 0.55}
                depthTest={false}
              />
            </mesh>
          );
        })}

      {showBrushPreview && (
        <mesh position={sculptBrushCenter ?? [0, 0, 0]} quaternion={brushQuaternion} renderOrder={35}>
          <ringGeometry args={[Math.max(0.001, sculptRadius * 0.96), sculptRadius, 96]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.72} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {isEditMode && <group ref={setPivotRef} visible={false} />}
      {isEditMode && pivotObject && selectedIndices.length > 0 && (
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
