'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createSelectedEdgeGeometry,
  createSelectedFaceGeometry,
  createSelectedFacesGeometry,
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
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const selectionMode = useEditorStore((state) => state.meshSelectionMode);
  const meshSelectMode = useEditorStore((state) => state.meshSelectMode);
  const selectedVertexIndices = useEditorStore((state) => state.selectedVertexIndices);
  const selectedEdgeVertexIndices = useEditorStore((state) => state.selectedEdgeVertexIndices);
  const selectedFaceIndex = useEditorStore((state) => state.selectedFaceIndex);
  const selectedFaceIndices = useEditorStore((state) => state.selectedFaceIndices);
  const hoverVertexIndex = useEditorStore((state) => state.hoverVertexIndex);
  const hoverFaceIndex = useEditorStore((state) => state.hoverFaceIndex);
  const hoverEdgeIndex = useEditorStore((state) => state.hoverEdgeIndex);
  const snapping = useEditorStore((state) => state.snapping);
  const snapStep = useEditorStore((state) => state.snapStep);
  const sculptBrushObjectId = useEditorStore((state) => state.sculptBrushObjectId);
  const sculptBrushCenter = useEditorStore((state) => state.sculptBrushCenter);
  const sculptBrushNormal = useEditorStore((state) => state.sculptBrushNormal);
  const sculptRadius = useEditorStore((state) => state.sculptRadius);
  const sculptStrength = useEditorStore((state) => state.sculptStrength);
  const sculptPressureStrength = useEditorStore((state) => state.sculptPressureStrength);
  const sculptPressureRadius = useEditorStore((state) => state.sculptPressureRadius);
  const sculptPointerType = useEditorStore((state) => state.sculptPointerType);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const toggleVertexSelection = useEditorStore((state) => state.toggleVertexSelection);
  const setSelectedEdge = useEditorStore((state) => state.setSelectedEdge);
  const setSelectedFace = useEditorStore((state) => state.setSelectedFace);
  const toggleFaceSelection = useEditorStore((state) => state.toggleFaceSelection);
  const setSelectedVertices = useEditorStore((state) => state.setSelectedVertices);
  const setSelectedFaces = useEditorStore((state) => state.setSelectedFaces);
  const setHoverVertex = useEditorStore((state) => state.setHoverVertex);
  const setHoverEdge = useEditorStore((state) => state.setHoverEdge);
  const setHoverFace = useEditorStore((state) => state.setHoverFace);
  const clearMeshSelection = useEditorStore((state) => state.clearMeshSelection);
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const pivotRef = useRef<THREE.Group | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [pivotObject, setPivotObject] = useState<THREE.Group | null>(null);
  const { gl, camera, scene } = useThree();

  const selectedIndices = useMemo(() => {
    if (!mesh) return [];
    if (selectionMode === 'face') {
      const faces = selectedFaceIndices.length > 0 ? selectedFaceIndices : selectedFaceIndex !== null ? [selectedFaceIndex] : [];
      return Array.from(new Set(faces.flatMap((faceIndex) => getFaceVertexIndices(mesh, faceIndex))));
    }

    if (selectionMode === 'edge' && selectedEdgeVertexIndices) {
      return selectedEdgeVertexIndices.filter((index) => index >= 0 && index < mesh.vertices.length);
    }

    return selectedVertexIndices.filter((index) => index >= 0 && index < mesh.vertices.length);
  }, [mesh, selectedEdgeVertexIndices, selectedFaceIndex, selectedFaceIndices, selectedVertexIndices, selectionMode]);

  const geometry = useMemo(() => (mesh ? editableMeshToBufferGeometry(mesh) : null), [mesh]);
  const edgesGeometry = useMemo(() => (geometry ? new THREE.EdgesGeometry(geometry, 1) : null), [geometry]);
  const meshEdges = useMemo(() => (mesh ? getMeshEdges(mesh) : []), [mesh]);
  const selectedEdgeGeometry = useMemo(
    () => (mesh && selectedEdgeVertexIndices ? createSelectedEdgeGeometry(mesh, selectedEdgeVertexIndices) : null),
    [mesh, selectedEdgeVertexIndices],
  );
  const selectedFaceGeometry = useMemo(() => {
    if (!mesh) return null;
    const faces = selectedFaceIndices.length > 0 ? selectedFaceIndices : selectedFaceIndex !== null ? [selectedFaceIndex] : [];
    if (faces.length === 0) return null;
    if (faces.length === 1) return createSelectedFaceGeometry(mesh, faces[0]);
    return createSelectedFacesGeometry(mesh, faces);
  }, [mesh, selectedFaceIndex, selectedFaceIndices]);
  const hoverFaceGeometry = useMemo(
    () => (mesh && hoverFaceIndex !== null ? createSelectedFaceGeometry(mesh, hoverFaceIndex) : null),
    [mesh, hoverFaceIndex],
  );
  const hoverEdgeGeometry = useMemo(() => {
    if (!mesh || hoverEdgeIndex === null) return null;
    const edge = meshEdges[hoverEdgeIndex];
    if (!edge) return null;
    return createSelectedEdgeGeometry(mesh, [edge.a, edge.b]);
  }, [mesh, hoverEdgeIndex, meshEdges]);
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
      hoverFaceGeometry?.dispose();
      hoverEdgeGeometry?.dispose();
    },
    [edgesGeometry, geometry, hoverEdgeGeometry, hoverFaceGeometry, selectedEdgeGeometry, selectedFaceGeometry],
  );

  const setPivotRef = useCallback((node: THREE.Group | null) => {
    pivotRef.current = node;
    setPivotObject(node);
  }, []);

  useEffect(() => {
    if (!mesh || !pivotRef.current || selectedIndices.length === 0 || dragRef.current) return;
    pivotRef.current.position.copy(getSelectionCenter(mesh, selectedIndices));
  }, [mesh, selectedIndices]);

  const meshSnapEnabled = useEditorStore((state) => state.meshSnapEnabled);
  const meshSnapTarget = useEditorStore((state) => state.meshSnapTarget);

  const findSnapPoint = useCallback(
    (worldPosition: THREE.Vector3): THREE.Vector3 | null => {
      if (!mesh || !pivotRef.current) return null;
      const excluded = dragRef.current?.vertexIndices ?? [];
      const excludedSet = new Set(excluded);
      const local = pivotRef.current.parent ? pivotRef.current.parent.worldToLocal(worldPosition.clone()) : worldPosition.clone();
      const threshold = Math.max(0.05, camera.position.distanceTo(worldPosition) * 0.035);

      if (meshSnapTarget === 'vertex') {
        let best: THREE.Vector3 | null = null;
        let bestDist = threshold;
        for (let index = 0; index < mesh.vertices.length; index += 1) {
          if (excludedSet.has(index)) continue;
          const vertex = mesh.vertices[index];
          if (!vertex) continue;
          const v = new THREE.Vector3(vertex[0], vertex[1], vertex[2]);
          const dist = v.distanceTo(local);
          if (dist < bestDist) {
            bestDist = dist;
            best = v;
          }
        }
        return best;
      }

      if (meshSnapTarget === 'edge') {
        let best: THREE.Vector3 | null = null;
        let bestDist = threshold;
        for (const edge of meshEdges) {
          if (excludedSet.has(edge.a) && excludedSet.has(edge.b)) continue;
          const a = mesh.vertices[edge.a];
          const b = mesh.vertices[edge.b];
          if (!a || !b) continue;
          const va = new THREE.Vector3(a[0], a[1], a[2]);
          const vb = new THREE.Vector3(b[0], b[1], b[2]);
          const segment = vb.clone().sub(va);
          const lengthSq = segment.lengthSq();
          const t = lengthSq === 0 ? 0 : THREE.MathUtils.clamp(local.clone().sub(va).dot(segment) / lengthSq, 0, 1);
          const point = va.add(segment.multiplyScalar(t));
          const dist = point.distanceTo(local);
          if (dist < bestDist) {
            bestDist = dist;
            best = point;
          }
        }
        return best;
      }

      if (meshSnapTarget === 'face') {
        let best: THREE.Vector3 | null = null;
        let bestDist = threshold;
        const faceCount = Math.floor(mesh.indices.length / 3);
        for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
          const verts = getFaceVertexIndices(mesh, faceIndex);
          if (verts.every((v) => excludedSet.has(v))) continue;
          const center = getSelectionCenter(mesh, verts);
          const dist = center.distanceTo(local);
          if (dist < bestDist) {
            bestDist = dist;
            best = center;
          }
        }
        return best;
      }

      return null;
    },
    [camera, mesh, meshEdges, meshSnapTarget],
  );

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

    if (meshSnapEnabled && meshSnapTarget !== 'off') {
      const snapWorld = pivotRef.current.getWorldPosition(new THREE.Vector3());
      const snapped = findSnapPoint(snapWorld);
      if (snapped && pivotRef.current.parent) {
        const snappedWorld = pivotRef.current.parent.localToWorld(snapped.clone());
        pivotRef.current.position.copy(pivotRef.current.parent.worldToLocal(snappedWorld));
      }
    }

    const delta = pivotRef.current.position.clone().sub(dragRef.current.start);
    if (snapping) {
      delta.x = Math.round(delta.x / snapStep) * snapStep;
      delta.y = Math.round(delta.y / snapStep) * snapStep;
      delta.z = Math.round(delta.z / snapStep) * snapStep;
    }
    updateObject(object.uuid, {
      editableMesh: translateMeshVertices(dragRef.current.mesh, dragRef.current.vertexIndices, delta),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const geometryMeshRef = useRef<THREE.Mesh | null>(null);
  const boxDragRef = useRef<{
    mode: 'box' | 'lasso';
    points: Array<{ x: number; y: number }>;
    additive: boolean;
  } | null>(null);
  const [boxVisual, setBoxVisual] = useState<{
    mode: 'box' | 'lasso';
    points: Array<{ x: number; y: number }>;
  } | null>(null);

  useEffect(() => {
    if (!mesh || activeTool !== 'edit' || (meshSelectMode !== 'box' && meshSelectMode !== 'lasso')) {
      setBoxVisual(null);
      boxDragRef.current = null;
      return;
    }

    const canvas = gl.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const toLocalPoints = (clientX: number, clientY: number) => {
      const parentRect = parent.getBoundingClientRect();
      return { x: clientX - parentRect.left, y: clientY - parentRect.top };
    };

    const projectVertex = (vertex: THREE.Vector3, worldMatrix: THREE.Matrix4) => {
      const world = vertex.clone().applyMatrix4(worldMatrix);
      const projected = world.project(camera);
      const canvasRect = canvas.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const sx = (projected.x * 0.5 + 0.5) * canvasRect.width + (canvasRect.left - parentRect.left);
      const sy = (-projected.y * 0.5 + 0.5) * canvasRect.height + (canvasRect.top - parentRect.top);
      return { x: sx, y: sy, behind: projected.z > 1 };
    };

    const pointInRect = (p: { x: number; y: number }, rect: { x0: number; y0: number; x1: number; y1: number }) =>
      p.x >= Math.min(rect.x0, rect.x1) && p.x <= Math.max(rect.x0, rect.x1) &&
      p.y >= Math.min(rect.y0, rect.y1) && p.y <= Math.max(rect.y0, rect.y1);

    const pointInPolygon = (p: { x: number; y: number }, polygon: Array<{ x: number; y: number }>) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;
        const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const computeSelection = () => {
      const drag = boxDragRef.current;
      const geomMesh = geometryMeshRef.current;
      if (!drag || !geomMesh || !mesh) return;
      const worldMatrix = geomMesh.matrixWorld;

      if (selectionMode === 'vertex') {
        const hits: number[] = [];
        for (let index = 0; index < mesh.vertices.length; index += 1) {
          const v = mesh.vertices[index];
          if (!v) continue;
          const p = projectVertex(new THREE.Vector3(v[0], v[1], v[2]), worldMatrix);
          if (p.behind) continue;
          const inside = drag.mode === 'box'
            ? pointInRect(p, { x0: drag.points[0].x, y0: drag.points[0].y, x1: drag.points[drag.points.length - 1].x, y1: drag.points[drag.points.length - 1].y })
            : pointInPolygon(p, drag.points);
          if (inside) hits.push(index);
        }
        if (hits.length > 0) {
          if (drag.additive) {
            const existing = new Set(useEditorStore.getState().selectedVertexIndices);
            const merged = Array.from(new Set([...existing, ...hits]));
            setSelectedVertices(merged);
          } else {
            setSelectedVertices(hits);
          }
        } else if (!drag.additive) {
          clearMeshSelection();
        }
        return;
      }

      if (selectionMode === 'face') {
        const faceCount = Math.floor(mesh.indices.length / 3);
        const hits: number[] = [];
        for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
          const verts = getFaceVertexIndices(mesh, faceIndex);
          const center = getSelectionCenter(mesh, verts);
          const p = projectVertex(center, worldMatrix);
          if (p.behind) continue;
          const inside = drag.mode === 'box'
            ? pointInRect(p, { x0: drag.points[0].x, y0: drag.points[0].y, x1: drag.points[drag.points.length - 1].x, y1: drag.points[drag.points.length - 1].y })
            : pointInPolygon(p, drag.points);
          if (inside) hits.push(faceIndex);
        }
        if (hits.length > 0) {
          if (drag.additive) {
            const existing = new Set(useEditorStore.getState().selectedFaceIndices);
            const merged = Array.from(new Set([...existing, ...hits]));
            setSelectedFaces(merged);
          } else {
            setSelectedFaces(hits);
          }
        } else if (!drag.additive) {
          clearMeshSelection();
        }
        return;
      }

      if (selectionMode === 'edge') {
        const hits: number[] = [];
        meshEdges.forEach((edge, edgeIndex) => {
          const a = mesh.vertices[edge.a];
          const b = mesh.vertices[edge.b];
          if (!a || !b) return;
          const pa = projectVertex(new THREE.Vector3(a[0], a[1], a[2]), worldMatrix);
          const pb = projectVertex(new THREE.Vector3(b[0], b[1], b[2]), worldMatrix);
          if (pa.behind || pb.behind) return;
          const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
          const inside = drag.mode === 'box'
            ? pointInRect(mid, { x0: drag.points[0].x, y0: drag.points[0].y, x1: drag.points[drag.points.length - 1].x, y1: drag.points[drag.points.length - 1].y })
            : pointInPolygon(mid, drag.points);
          if (inside) hits.push(edgeIndex);
        });
        if (hits.length > 0) {
          useEditorStore.getState().setSelectedEdges(hits);
        } else if (!drag.additive) {
          clearMeshSelection();
        }
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const start = toLocalPoints(event.clientX, event.clientY);
      boxDragRef.current = {
        mode: meshSelectMode === 'lasso' ? 'lasso' : 'box',
        points: [start],
        additive: event.shiftKey,
      };
      setBoxVisual({ mode: meshSelectMode === 'lasso' ? 'lasso' : 'box', points: [start] });
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = boxDragRef.current;
      if (!drag) return;
      const point = toLocalPoints(event.clientX, event.clientY);
      if (drag.mode === 'box') {
        drag.points = [drag.points[0], point];
      } else {
        drag.points.push(point);
      }
      setBoxVisual({ mode: drag.mode, points: [...drag.points] });
    };

    const onPointerUp = () => {
      const drag = boxDragRef.current;
      if (drag && drag.points.length > 1) {
        const start = drag.points[0];
        const end = drag.points[drag.points.length - 1];
        const moved = Math.hypot(end.x - start.x, end.y - start.y) > 4;
        if (moved) computeSelection();
      }
      boxDragRef.current = null;
      setBoxVisual(null);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, [
    activeTool,
    camera,
    clearMeshSelection,
    gl,
    mesh,
    meshEdges,
    meshSelectMode,
    selectionMode,
    setSelectedFaces,
    setSelectedVertices,
  ]);

  const selectionOverlay = boxVisual && gl.domElement.parentElement
    ? createPortal(
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
          {boxVisual.mode === 'box' && boxVisual.points.length >= 2 ? (
            <div
              className="absolute border border-emerald-300 bg-emerald-400/10"
              style={{
                left: Math.min(boxVisual.points[0].x, boxVisual.points[boxVisual.points.length - 1].x),
                top: Math.min(boxVisual.points[0].y, boxVisual.points[boxVisual.points.length - 1].y),
                width: Math.abs(boxVisual.points[boxVisual.points.length - 1].x - boxVisual.points[0].x),
                height: Math.abs(boxVisual.points[boxVisual.points.length - 1].y - boxVisual.points[0].y),
              }}
            />
          ) : null}
          {boxVisual.mode === 'lasso' && boxVisual.points.length >= 2 ? (
            <svg className="absolute inset-0 h-full w-full">
              <polyline
                points={boxVisual.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(52,211,153,0.12)"
                stroke="#34d399"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            </svg>
          ) : null}
        </div>,
        gl.domElement.parentElement,
      )
    : null;

  if (!mesh || !selectedObjectIds.includes(object.uuid) || viewportDisplayMode === 'primitive') return null;

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
          ref={geometryMeshRef}
          geometry={geometry}
          visible={false}
          onPointerMove={(event) => {
            if (!event.face) return;
            const faceIndex = event.faceIndex ?? Math.floor(event.face.a / 3);
            if (selectionMode === 'vertex') {
              const localPoint = event.object.worldToLocal(event.point.clone());
              const closestVertex = pickClosestVertexInFace(faceIndex, localPoint);
              if (closestVertex !== null && hoverVertexIndex !== closestVertex) setHoverVertex(closestVertex);
            } else if (selectionMode === 'face') {
              if (hoverFaceIndex !== faceIndex) setHoverFace(faceIndex);
            } else if (selectionMode === 'edge') {
              const localPoint = event.object.worldToLocal(event.point.clone());
              const edge = pickClosestEdgeInFace(faceIndex, localPoint);
              if (edge) {
                const edgeIndex = meshEdges.findIndex(
                  (item) => (item.a === edge[0] && item.b === edge[1]) || (item.a === edge[1] && item.b === edge[0]),
                );
                if (edgeIndex >= 0 && hoverEdgeIndex !== edgeIndex) setHoverEdge(edgeIndex);
              }
            }
          }}
          onPointerOut={() => {
            setHoverVertex(null);
            setHoverFace(null);
            setHoverEdge(null);
          }}
          onClick={(event) => {
            if (!event.face) return;
            event.stopPropagation();
            setSelectedObject(object.uuid);

            const faceIndex = event.faceIndex ?? Math.floor(event.face.a / 3);

            if (selectionMode === 'face') {
              if (event.nativeEvent.shiftKey) {
                toggleFaceSelection(faceIndex, true);
              } else {
                setSelectedFace(faceIndex, getFaceVertexIndices(mesh, faceIndex));
              }
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

      {isEditMode && hoverFaceGeometry && !selectedFaceIndices.includes(hoverFaceIndex ?? -1) && hoverFaceIndex !== selectedFaceIndex && (
        <mesh geometry={hoverFaceGeometry} renderOrder={19}>
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.22} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {isEditMode && hoverEdgeGeometry && hoverEdgeIndex !== null && (
        <lineSegments geometry={hoverEdgeGeometry} renderOrder={18}>
          <lineBasicMaterial color="#67e8f9" transparent opacity={0.85} depthTest={false} />
        </lineSegments>
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
          const hovered = hoverVertexIndex === index;
          if (!selected && !hovered && vertexCount > VERTEX_HANDLE_LIMIT) return null;

          return (
            <mesh
              key={`vertex-${index}`}
              geometry={selected ? selectedVertexHandleGeometry : vertexHandleGeometry}
              position={vertex}
              renderOrder={30}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHoverVertex(index);
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                setHoverVertex(null);
              }}
              onClick={(event) => {
                if (!isEditMode || meshSelectMode !== 'click') return;
                event.stopPropagation();
                setSelectedObject(object.uuid);
                toggleVertexSelection(index, event.nativeEvent.shiftKey);
              }}
            >
              <meshBasicMaterial
                color={selected ? '#fbbf24' : hovered ? '#67e8f9' : '#e5e7eb'}
                transparent
                opacity={selected ? 1 : 0.86}
                depthTest={false}
              />
            </mesh>
          );
        })}

      {showEdgeHandles &&
        meshEdges.map((edge, edgeIndex) => {
          const first = mesh.vertices[edge.a];
          const second = mesh.vertices[edge.b];
          if (!first || !second) return null;

          const center = new THREE.Vector3(...first).add(new THREE.Vector3(...second)).multiplyScalar(0.5);
          const selected =
            selectedEdgeVertexIndices &&
            ((selectedEdgeVertexIndices[0] === edge.a && selectedEdgeVertexIndices[1] === edge.b) ||
              (selectedEdgeVertexIndices[0] === edge.b && selectedEdgeVertexIndices[1] === edge.a));
          const hovered = hoverEdgeIndex === edgeIndex;
          if (!selected && !hovered && meshEdges.length > EDGE_HANDLE_LIMIT) return null;

          return (
            <mesh
              key={`edge-${edge.key}`}
              geometry={edgeHandleGeometry}
              position={center}
              renderOrder={31}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHoverEdge(edgeIndex);
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                setHoverEdge(null);
              }}
              onClick={(event) => {
                if (meshSelectMode !== 'click') return;
                event.stopPropagation();
                setSelectedObject(object.uuid);
                setSelectedEdge([edge.a, edge.b]);
              }}
            >
              <meshBasicMaterial color={selected ? '#fbbf24' : hovered ? '#a5f3fc' : '#67e8f9'} depthTest={false} />
            </mesh>
          );
        })}

      {showFaceHandles &&
        Array.from({ length: faceCount }, (_, faceIndex) => {
          const faceVertices = getFaceVertexIndices(mesh, faceIndex);
          const center = getSelectionCenter(mesh, faceVertices);
          const selected = selectedFaceIndex === faceIndex || selectedFaceIndices.includes(faceIndex);
          const hovered = hoverFaceIndex === faceIndex;
          if (!selected && !hovered && faceCount > FACE_HANDLE_LIMIT) return null;

          return (
            <mesh
              key={`face-${faceIndex}`}
              geometry={faceHandleGeometry}
              position={center}
              renderOrder={30}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHoverFace(faceIndex);
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                setHoverFace(null);
              }}
              onClick={(event) => {
                if (!isEditMode || meshSelectMode !== 'click') return;
                event.stopPropagation();
                setSelectedObject(object.uuid);
                if (event.nativeEvent.shiftKey) {
                  toggleFaceSelection(faceIndex, true);
                } else {
                  setSelectedFace(faceIndex, faceVertices);
                }
              }}
            >
              <meshBasicMaterial
                color={selected ? '#fbbf24' : hovered ? '#7dd3fc' : '#38bdf8'}
                transparent
                opacity={isEditMode ? 1 : 0.55}
                depthTest={false}
              />
            </mesh>
          );
        })}

      {showBrushPreview && (
        <group position={sculptBrushCenter ?? [0, 0, 0]} quaternion={brushQuaternion} renderOrder={35}>
          {/* Crosshair lines for precision alignment */}
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[sculptRadius * 0.04, sculptRadius * 2]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthTest={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[sculptRadius * 2, sculptRadius * 0.04]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthTest={false} side={THREE.DoubleSide} />
          </mesh>
          {/* Outer ring - brush radius boundary */}
          <mesh>
            <ringGeometry args={[Math.max(0.001, sculptRadius * 0.96), sculptRadius, 96]} />
            <meshBasicMaterial
              color={sculptPointerType === 'pen' ? '#a78bfa' : '#fbbf24'}
              transparent
              opacity={0.72}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Inner ring - 50% falloff zone */}
          <mesh>
            <ringGeometry args={[Math.max(0.001, sculptRadius * 0.46), sculptRadius * 0.5, 64]} />
            <meshBasicMaterial
              color={sculptPointerType === 'pen' ? '#c4b5fd' : '#fde68a'}
              transparent
              opacity={0.35}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Center dot - pressure indicator */}
          <mesh position={[0, 0, 0.001]}>
            <circleGeometry args={[sculptRadius * 0.08, 16]} />
            <meshBasicMaterial
              color={sculptPressureStrength ? '#34d399' : '#f87171'}
              transparent
              opacity={0.9}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
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

      {selectionOverlay}
    </>
  );
}
