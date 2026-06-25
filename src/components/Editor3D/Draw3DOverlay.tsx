'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEditorStore } from '@/store/editorStore';
import { useSceneStore } from '@/store/sceneStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import {
  draw3DToBufferGeometry,
  bufferGeometryToEditableMesh,
  createDrawPlaneNormal,
  applySnapGrid,
} from '@/lib/draw3DGeometryFactory';
import type { Vec3 } from '@/store/types';

const GRID_PLANE_SIZE = 200;

export default function Draw3DOverlay() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const draw3DConfig = useEditorStore((state) => state.draw3DConfig);
  const draw3DPoints = useEditorStore((state) => state.draw3DPoints);
  const draw3DActive = useEditorStore((state) => state.draw3DActive);
  const setDraw3DPoints = useEditorStore((state) => state.setDraw3DPoints);
  const addDraw3DPoint = useEditorStore((state) => state.addDraw3DPoint);
  const clearDraw3D = useEditorStore((state) => state.clearDraw3D);
  const setDraw3DActive = useEditorStore((state) => state.setDraw3DActive);
  const draw3DSnapEnabled = useEditorStore((state) => state.draw3DSnapEnabled);
  const snapStep = useEditorStore((state) => state.snapStep);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);

  const addObject = useSceneStore((state) => state.addObject);
  const createMaterialForObject = useMaterialStore((state) => state.createMaterialForObject);
  const updateMaterial = useMaterialStore((state) => state.updateMaterial);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  const { camera, raycaster, scene } = useThree();
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<THREE.Vector3 | null>(null);
  const activePlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const planeOriginRef = useRef<THREE.Vector3 | null>(null);
  const lastValidIntersectionRef = useRef<THREE.Vector3 | null>(null);

  const isActive = activeTool === 'draw3D';
  const isSurfaceMode = draw3DConfig.plane === 'surface';

  useEffect(() => {
    if (!isActive) return;
    if (draw3DPoints.length > 0) return;
    if (isSurfaceMode) return;
    const normal = createDrawPlaneNormal(draw3DConfig.plane, camera as THREE.Camera);
    const camTarget = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5));
    activePlaneRef.current.setFromNormalAndCoplanarPoint(normal, camTarget);
  }, [isActive, draw3DConfig.plane, camera, isSurfaceMode, draw3DPoints.length]);

  const modeNeedsClick = draw3DConfig.mode === 'polyline' || draw3DConfig.mode === 'shape' || draw3DConfig.mode === 'extrude' || draw3DConfig.mode === 'surface';
  const modeNeedsDrag = draw3DConfig.mode === 'stroke';

  const collectSceneMeshes = useCallback((): THREE.Mesh[] => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.visible
      ) {
        let skip = false;
        let current: THREE.Object3D | null = child;
        while (current) {
          if (current.userData.isHelper || current.userData.isDrawOverlay || current.userData.isPhysicsDebug) {
            skip = true;
            break;
          }
          current = current.parent;
        }
        if (!skip) meshes.push(child);
      }
    });
    return meshes;
  }, [scene]);

  const intersectSceneObjects = useCallback((event: ThreeEvent<PointerEvent>): THREE.Intersection | null => {
    raycaster.setFromCamera(event.pointer, camera);
    const meshes = collectSceneMeshes();
    const hits = raycaster.intersectObjects(meshes, false);
    return hits.length > 0 ? hits[0] : null;
  }, [raycaster, camera, collectSceneMeshes]);

  const intersectDrawPlane = useCallback((event: ThreeEvent<PointerEvent>): THREE.Vector3 | null => {
    raycaster.setFromCamera(event.pointer, camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(activePlaneRef.current, intersection);
    return hit ? intersection : null;
  }, [raycaster, camera]);

  const getWorldPoint = useCallback((event: ThreeEvent<PointerEvent>): THREE.Vector3 | null => {
    if (isSurfaceMode) {
      const sceneHit = intersectSceneObjects(event);
      if (sceneHit && sceneHit.face) {
        lastValidIntersectionRef.current = sceneHit.point.clone();
        return sceneHit.point;
      }
      if (lastValidIntersectionRef.current) {
        return null;
      }
      return null;
    }

    const planeHit = intersectDrawPlane(event);
    if (!planeHit) return null;

    lastValidIntersectionRef.current = planeHit.clone();

    if (draw3DSnapEnabled && snapStep > 0) {
      return applySnapGrid(planeHit, snapStep);
    }
    return planeHit;
  }, [isSurfaceMode, intersectSceneObjects, intersectDrawPlane, draw3DSnapEnabled, snapStep]);

  const updateActivePlane = useCallback((origin: THREE.Vector3) => {
    let normal: THREE.Vector3;

    if (isSurfaceMode) {
      normal = new THREE.Vector3(0, 1, 0);
    } else if (draw3DConfig.plane === 'camera') {
      normal = camera.getWorldDirection(new THREE.Vector3()).negate().normalize();
    } else {
      normal = createDrawPlaneNormal(draw3DConfig.plane, camera as THREE.Camera);
    }

    activePlaneRef.current.setFromNormalAndCoplanarPoint(normal, origin);
    planeOriginRef.current = origin.clone();
  }, [draw3DConfig.plane, camera, isSurfaceMode]);

  const finalizeDrawing = useCallback((points: Vec3[]) => {
    if (points.length < 2 && draw3DConfig.mode === 'stroke') return;
    if (points.length < 3 && (draw3DConfig.mode === 'shape' || draw3DConfig.mode === 'extrude' || draw3DConfig.mode === 'surface')) return;
    if (points.length < 2) return;

    const geo = draw3DToBufferGeometry(points, draw3DConfig);
    if (!geo) {
      clearDraw3D();
      return;
    }

    const editableMesh = bufferGeometryToEditableMesh(geo);
    geo.dispose();

    if (!editableMesh) {
      clearDraw3D();
      return;
    }

    pushSnapshot();

    const modeNames: Record<string, string> = {
      stroke: 'Stroke',
      polyline: 'Polyline',
      shape: 'Shape',
      surface: 'Surface',
      extrude: 'Extrude',
    };
    const objectName = `${modeNames[draw3DConfig.mode] ?? 'Draw'} ${Date.now().toString(36).slice(-4)}`;

    const newObject = addObject({
      name: objectName,
      kind: 'mesh',
      editableMesh,
      position: [0, 0, 0],
    });

    createMaterialForObject(newObject.uuid, newObject.materialId, `Material ${objectName}`);
    updateMaterial(newObject.materialId, {
      color: draw3DConfig.color,
      metalness: draw3DConfig.metalness,
      roughness: draw3DConfig.roughness,
    });

    setSelectedObject(newObject.uuid);
    clearDraw3D();
    planeOriginRef.current = null;
  }, [draw3DConfig, addObject, createMaterialForObject, updateMaterial, pushSnapshot, setSelectedObject, clearDraw3D]);

  useEffect(() => {
    if (!isActive) {
      planeOriginRef.current = null;
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearDraw3D();
        planeOriginRef.current = null;
      } else if (e.key === 'Enter') {
        const pts = useEditorStore.getState().draw3DPoints;
        if (pts.length >= 2) {
          finalizeDrawing(pts);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, clearDraw3D, finalizeDrawing]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!isActive) return;
    event.stopPropagation();

    if (isSurfaceMode) {
      const sceneHit = intersectSceneObjects(event);
      if (!sceneHit || !sceneHit.face) {
        const fallback = intersectDrawPlane(event);
        if (fallback) {
          updateActivePlane(fallback);
        }
        return;
      }

      const point = sceneHit.point;
      const normal = sceneHit.face.normal.clone();
      const meshObj = sceneHit.object;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(meshObj.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();

      if (draw3DPoints.length === 0) {
        activePlaneRef.current.setFromNormalAndCoplanarPoint(normal, point);
        planeOriginRef.current = point.clone();
      }

      if (modeNeedsDrag) {
        drawingRef.current = true;
        setDraw3DActive(true);
        const v: Vec3 = [point.x, point.y, point.z];
        setDraw3DPoints([v]);
        lastPointRef.current = point;

        const pointerId = event.pointerId;
        const handleGlobalUp = (e: PointerEvent) => {
          if (e.pointerId === pointerId) {
            endStroke();
            window.removeEventListener('pointerup', handleGlobalUp);
            window.removeEventListener('pointercancel', handleGlobalUp);
          }
        };
        window.addEventListener('pointerup', handleGlobalUp);
        window.addEventListener('pointercancel', handleGlobalUp);
      }
      return;
    }

    const point = getWorldPoint(event);
    if (!point) return;

    if (draw3DPoints.length === 0) {
      updateActivePlane(point);
    }

    if (modeNeedsDrag) {
      drawingRef.current = true;
      setDraw3DActive(true);
      const v: Vec3 = [point.x, point.y, point.z];
      setDraw3DPoints([v]);
      lastPointRef.current = point;

      const pointerId = event.pointerId;
      const handleGlobalUp = (e: PointerEvent) => {
        if (e.pointerId === pointerId) {
          endStroke();
          window.removeEventListener('pointerup', handleGlobalUp);
          window.removeEventListener('pointercancel', handleGlobalUp);
        }
      };
      window.addEventListener('pointerup', handleGlobalUp);
      window.addEventListener('pointercancel', handleGlobalUp);
    }
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isActive) return;

    if (isSurfaceMode) {
      const sceneHit = intersectSceneObjects(event);
      if (sceneHit && sceneHit.face) {
        const point = sceneHit.point;
        setHoverPoint(point);

        if (drawingRef.current && modeNeedsDrag && point) {
          const minDist = draw3DConfig.radius * 0.3;
          if (lastPointRef.current && point.distanceTo(lastPointRef.current) < minDist) return;
          lastPointRef.current = point;
          addDraw3DPoint([point.x, point.y, point.z]);
        }
      } else {
        if (planeOriginRef.current && activePlaneRef.current) {
          raycaster.setFromCamera(event.pointer, camera);
          const intersection = new THREE.Vector3();
          const hit = raycaster.ray.intersectPlane(activePlaneRef.current, intersection);
          if (hit) setHoverPoint(intersection);
          else setHoverPoint(null);
        } else {
          setHoverPoint(null);
        }

        if (drawingRef.current && modeNeedsDrag) {
          const planeHit = intersectDrawPlane(event);
          if (planeHit) {
            const minDist = draw3DConfig.radius * 0.3;
            if (lastPointRef.current && planeHit.distanceTo(lastPointRef.current) < minDist) return;
            lastPointRef.current = planeHit;
            addDraw3DPoint([planeHit.x, planeHit.y, planeHit.z]);
          }
        }
      }
      return;
    }

    const point = getWorldPoint(event);
    if (point) setHoverPoint(point);
    else setHoverPoint(null);

    if (modeNeedsDrag && drawingRef.current && point) {
      const minDist = draw3DConfig.radius * 0.3;
      if (lastPointRef.current && point.distanceTo(lastPointRef.current) < minDist) return;
      lastPointRef.current = point;
      addDraw3DPoint([point.x, point.y, point.z]);
    }
  };

  const endStroke = () => {
    drawingRef.current = false;
    setDraw3DActive(false);
  };

  const handleClick = (event: ThreeEvent<PointerEvent>) => {
    if (!isActive || !modeNeedsClick) return;
    event.stopPropagation();

    if (isSurfaceMode) {
      const sceneHit = intersectSceneObjects(event);
      if (!sceneHit || !sceneHit.face) return;
      const point = sceneHit.point;

      if (draw3DPoints.length === 0) {
        const normal = sceneHit.face.normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(sceneHit.object.matrixWorld);
        normal.applyMatrix3(normalMatrix).normalize();
        activePlaneRef.current.setFromNormalAndCoplanarPoint(normal, point);
        planeOriginRef.current = point.clone();
      } else {
        const first = new THREE.Vector3(...draw3DPoints[0]);
        if (first.distanceTo(point) < 0.08) {
          finalizeDrawing(draw3DPoints);
          return;
        }
      }
      addDraw3DPoint([point.x, point.y, point.z]);
      return;
    }

    const point = getWorldPoint(event);
    if (!point) return;

    if (draw3DPoints.length === 0) {
      updateActivePlane(point);
    }

    if (draw3DPoints.length >= 3 && (draw3DConfig.mode === 'shape' || draw3DConfig.mode === 'extrude' || draw3DConfig.mode === 'surface')) {
      const first = new THREE.Vector3(...draw3DPoints[0]);
      if (first.distanceTo(point) < 0.08) {
        finalizeDrawing(draw3DPoints);
        return;
      }
    }

    addDraw3DPoint([point.x, point.y, point.z]);
  };

  const handleDoubleClick = (event: ThreeEvent<PointerEvent>) => {
    if (!isActive || !modeNeedsClick) return;
    event.stopPropagation();

    const pts = useEditorStore.getState().draw3DPoints;
    if (pts.length >= 3 && (draw3DConfig.mode === 'shape' || draw3DConfig.mode === 'extrude' || draw3DConfig.mode === 'surface')) {
      const cleaned = pts.slice(0, -1);
      finalizeDrawing(cleaned);
    } else if (pts.length >= 2) {
      const cleaned = pts.slice(0, -1);
      finalizeDrawing(cleaned);
    }
  };

  const handleContextMenu = (event: ThreeEvent<PointerEvent>) => {
    if (!isActive) return;
    event.stopPropagation();
    const pts = useEditorStore.getState().draw3DPoints;
    if (modeNeedsClick && pts.length >= 2) {
      finalizeDrawing(pts);
    } else {
      clearDraw3D();
      planeOriginRef.current = null;
    }
  };

  const previewGeometry = useMemo(() => {
    if (!isActive || draw3DPoints.length < 2) return null;
    return draw3DToBufferGeometry(draw3DPoints, draw3DConfig);
  }, [draw3DPoints, draw3DConfig, isActive]);

  const linePoints = useMemo(() => {
    if (!isActive) return [];
    const pts = draw3DPoints.map((p) => new THREE.Vector3(...p));
    if (hoverPoint && pts.length > 0) pts.push(hoverPoint);
    return pts;
  }, [draw3DPoints, hoverPoint, isActive]);

  const lineGeometry = useMemo(() => {
    if (linePoints.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  const closeHint = useMemo(() => {
    if (draw3DPoints.length < 3 || !hoverPoint) return false;
    if (!modeNeedsClick) return false;
    const first = new THREE.Vector3(...draw3DPoints[0]);
    return first.distanceTo(hoverPoint) < 0.08;
  }, [draw3DPoints, hoverPoint, modeNeedsClick]);

  useEffect(() => () => {
    previewGeometry?.dispose();
  }, [previewGeometry]);

  const drawPlaneVisual = useMemo(() => {
    if (!isActive || isSurfaceMode) return null;
    if (draw3DPoints.length > 0 || draw3DActive) return activePlaneRef.current;
    return null;
  }, [isActive, isSurfaceMode, draw3DPoints.length, draw3DActive]);

  const gridPlaneTransform = useMemo(() => {
    if (isSurfaceMode) {
      return { position: [0, 0, 0] as [number, number, number], quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)) };
    }
    if (planeOriginRef.current) {
      const normal = activePlaneRef.current.normal;
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      return { position: planeOriginRef.current.toArray() as [number, number, number], quaternion };
    }
    if (draw3DConfig.plane === 'camera') {
      const normal = camera.getWorldDirection(new THREE.Vector3()).negate().normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      const camPos = camera.position.clone();
      const target = camPos.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5));
      return { position: target.toArray() as [number, number, number], quaternion };
    }
    switch (draw3DConfig.plane) {
      case 'xy':
        return { position: [0, 0, 0] as [number, number, number], quaternion: new THREE.Quaternion() };
      case 'yz':
        return { position: [0, 0, 0] as [number, number, number], quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)) };
      case 'xz':
      default:
        return { position: [0, 0, 0] as [number, number, number], quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)) };
    }
  }, [isSurfaceMode, draw3DConfig.plane, camera, draw3DPoints.length > 0, draw3DActive]);

  if (!isActive) return null;

  return (
    <group userData={{ isDrawOverlay: true }}>
      <mesh
        position={gridPlaneTransform.position}
        quaternion={gridPlaneTransform.quaternion}
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <planeGeometry args={[GRID_PLANE_SIZE, GRID_PLANE_SIZE]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {drawPlaneVisual && planeOriginRef.current && (
        <DrawPlaneVisual plane={drawPlaneVisual} origin={planeOriginRef.current} mode={draw3DConfig.plane} />
      )}

      {lineGeometry && (
        <line>
          <primitive object={lineGeometry} attach="geometry" />
          <lineBasicMaterial color={closeHint ? '#34d399' : '#fbbf24'} linewidth={2} />
        </line>
      )}

      {previewGeometry && draw3DPoints.length >= 2 && (
        <mesh geometry={previewGeometry}>
          <meshStandardMaterial
            color={draw3DConfig.color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {draw3DPoints.map((p, i) => (
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

function DrawPlaneVisual({ plane, origin, mode }: { plane: THREE.Plane; origin: THREE.Vector3; mode: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const normal = plane.normal;
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    meshRef.current.quaternion.copy(quaternion);
    meshRef.current.position.copy(origin);
  }, [plane, origin]);

  const planeColor = useMemo(() => {
    switch (mode) {
      case 'xz': return '#34d399';
      case 'xy': return '#f87171';
      case 'yz': return '#60a5fa';
      case 'camera': return '#fbbf24';
      default: return '#34d399';
    }
  }, [mode]);

  return (
    <mesh ref={meshRef} userData={{ isDrawOverlay: true }}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial color={planeColor} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
