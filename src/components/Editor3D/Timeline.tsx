'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Diamond, Pause, Play, SkipBack, SkipForward, Trash2 } from 'lucide-react';
import { frameToSeconds, sampleObjectTransform, type KeyframeInterpolation, type TransformKeyframe } from '@/lib/animation';
import { useEditorStore } from '@/store/editorStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';

const iconButtonClass =
  'grid min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-md border border-neutral-700/80 bg-[#0d0f10] text-neutral-400 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35 touch-manipulation sm:h-9 sm:w-9';

const smallButtonClass =
  'inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35 touch-manipulation sm:h-8 sm:px-2';

const inputClass =
  'h-7 min-w-0 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs tabular-nums text-neutral-100 outline-none transition focus:border-emerald-400';

const labelClass = 'text-[9px] font-medium uppercase tracking-[0.12em] text-neutral-500';

const interpolationLabels: Record<KeyframeInterpolation, string> = {
  linear: 'Linear',
  hold: 'Hold',
  ease: 'Ease',
};

const interpolationModes = Object.keys(interpolationLabels) as KeyframeInterpolation[];

const clampFrame = (frame: number, durationFrames: number) =>
  Math.max(0, Math.min(durationFrames, Number.isFinite(frame) ? Math.round(frame) : 0));

const getKeyframeObjectName = (objectId: string, objects: ReturnType<typeof useSceneStore.getState>['objects']) =>
  objects.find((object) => object.uuid === objectId)?.name ?? 'Objeto removido';

function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={Math.round(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      />
    </label>
  );
}

function TogglePill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 cursor-pointer rounded-md border px-2.5 text-[10px] font-medium uppercase tracking-[0.08em] transition touch-manipulation sm:h-8 sm:px-2 ${
        active
          ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-100'
          : 'border-neutral-700/80 bg-[#0d0f10] text-neutral-500 hover:border-emerald-400/70 hover:text-emerald-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function Timeline() {
  const timelineCollapsed = useEditorStore((state) => state.timelineCollapsed);
  const setTimelineCollapsed = useEditorStore((state) => state.setTimelineCollapsed);
  const fps = useTimelineStore((state) => state.fps);
  const startFrame = useTimelineStore((state) => state.startFrame);
  const endFrame = useTimelineStore((state) => state.endFrame);
  const durationFrames = useTimelineStore((state) => state.durationFrames);
  const playheadFrame = useTimelineStore((state) => state.playheadFrame);
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const autoKey = useTimelineStore((state) => state.autoKey);
  const loopPlayback = useTimelineStore((state) => state.loopPlayback);
  const defaultInterpolation = useTimelineStore((state) => state.defaultInterpolation);
  const selectedKeyframeIds = useTimelineStore((state) => state.selectedKeyframeIds);
  const keyframes = useTimelineStore((state) => state.keyframes);
  const setPlayheadFrame = useTimelineStore((state) => state.setPlayheadFrame);
  const setFps = useTimelineStore((state) => state.setFps);
  const setDurationFrames = useTimelineStore((state) => state.setDurationFrames);
  const setFrameRange = useTimelineStore((state) => state.setFrameRange);
  const togglePlayback = useTimelineStore((state) => state.togglePlayback);
  const setAutoKey = useTimelineStore((state) => state.setAutoKey);
  const setLoopPlayback = useTimelineStore((state) => state.setLoopPlayback);
  const setDefaultInterpolation = useTimelineStore((state) => state.setDefaultInterpolation);
  const addTransformKeyframe = useTimelineStore((state) => state.addTransformKeyframe);
  const selectKeyframe = useTimelineStore((state) => state.selectKeyframe);
  const selectObjectKeyframes = useTimelineStore((state) => state.selectObjectKeyframes);
  const clearKeyframeSelection = useTimelineStore((state) => state.clearKeyframeSelection);
  const removeKeyframe = useTimelineStore((state) => state.removeKeyframe);
  const removeSelectedKeyframes = useTimelineStore((state) => state.removeSelectedKeyframes);
  const removeCurrentFrameKeyframes = useTimelineStore((state) => state.removeCurrentFrameKeyframes);
  const clearObjectKeyframes = useTimelineStore((state) => state.clearObjectKeyframes);
  const clearAllKeyframes = useTimelineStore((state) => state.clearAllKeyframes);
  const moveSelectedKeyframes = useTimelineStore((state) => state.moveSelectedKeyframes);
  const duplicateSelectedKeyframes = useTimelineStore((state) => state.duplicateSelectedKeyframes);
  const setSelectedInterpolation = useTimelineStore((state) => state.setSelectedInterpolation);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const objects = useSceneStore((state) => state.objects);
  const selectedObjectId = selectedObjectIds[0] ?? null;
  const selectedObject = objects.find((object) => object.uuid === selectedObjectId) ?? null;
  const currentFrame = Math.round(playheadFrame);
  const selectedKeyframes = keyframes.filter((keyframe) => selectedKeyframeIds.includes(keyframe.id));
  const selectedObjectKeyframes = keyframes.filter((keyframe) => keyframe.objectId === selectedObjectId);
  const currentObjectHasKey = selectedObjectKeyframes.some((keyframe) => keyframe.frame === currentFrame);
  const rangeSpan = Math.max(1, endFrame - startFrame);
  const marks = useMemo(
    () => Array.from({ length: 7 }, (_, index) => Math.round(startFrame + (rangeSpan / 6) * index)),
    [rangeSpan, startFrame],
  );
  const lanes = useMemo(() => {
    const objectIds = Array.from(new Set(keyframes.map((keyframe) => keyframe.objectId)));
    if (selectedObjectId && !objectIds.includes(selectedObjectId)) objectIds.unshift(selectedObjectId);
    return objectIds;
  }, [keyframes, selectedObjectId]);

  const applyFrame = useCallback((frame: number) => {
    const timeline = useTimelineStore.getState();
    const scene = useSceneStore.getState();
    const animatedObjectIds = Array.from(new Set(timeline.keyframes.map((keyframe) => keyframe.objectId)));

    animatedObjectIds.forEach((objectId) => {
      const sample = sampleObjectTransform(timeline.keyframes, objectId, frame);
      if (sample) scene.updateObject(objectId, sample);
    });
  }, []);

  const goToFrame = useCallback(
    (frame: number) => {
      const nextFrame = clampFrame(frame, durationFrames);
      setPlayheadFrame(nextFrame);
      applyFrame(nextFrame);
    },
    [applyFrame, durationFrames, setPlayheadFrame],
  );

  const selectedFrames = useMemo(() => selectedObjectKeyframes.map((keyframe) => keyframe.frame).sort((a, b) => a - b), [selectedObjectKeyframes]);

  const goToAdjacentKey = (direction: 1 | -1) => {
    if (selectedFrames.length === 0) return;
    const nextFrame =
      direction > 0
        ? selectedFrames.find((frame) => frame > currentFrame) ?? selectedFrames[0]
        : [...selectedFrames].reverse().find((frame) => frame < currentFrame) ?? selectedFrames[selectedFrames.length - 1];
    goToFrame(nextFrame);
  };

  useEffect(() => {
    if (!isPlaying) return;

    let animationFrame = 0;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const deltaSeconds = (time - lastTime) / 1000;
      lastTime = time;

      const timeline = useTimelineStore.getState();
      const advancedFrame = timeline.playheadFrame + deltaSeconds * timeline.fps;
      let nextFrame = advancedFrame;

      if (advancedFrame > timeline.endFrame) {
        if (timeline.loopPlayback) {
          nextFrame = timeline.startFrame;
        } else {
          nextFrame = timeline.endFrame;
          timeline.setPlaying(false);
        }
      }

      timeline.setPlayheadFrame(nextFrame);
      applyFrame(nextFrame);

      if (useTimelineStore.getState().isPlaying) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [applyFrame, isPlaying]);

  const addKeyframe = () => {
    if (!selectedObject) return;
    addTransformKeyframe(selectedObject, currentFrame);
  };

  const setInterpolation = (interpolation: KeyframeInterpolation) => {
    if (selectedKeyframeIds.length > 0) {
      setSelectedInterpolation(interpolation);
      return;
    }

    setDefaultInterpolation(interpolation);
  };

  const keyStyle = (keyframe: TransformKeyframe) => {
    const visibleFrame = Math.max(startFrame, Math.min(endFrame, keyframe.frame));
    return { left: `${((visibleFrame - startFrame) / rangeSpan) * 100}%` };
  };

  return (
    <footer
      className={`flex shrink-0 flex-col border-t border-neutral-800 bg-[#17191b] ${
        timelineCollapsed
          ? 'h-10'
          : 'h-[21rem] lg:h-[15.5rem]'
      }`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-neutral-800 px-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">Timeline</span>
        <button
          type="button"
          onClick={() => setTimelineCollapsed(!timelineCollapsed)}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
          title={timelineCollapsed ? 'Expandir' : 'Recolher'}
        >
          <ChevronDown size={14} className={`transition ${timelineCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>
      {!timelineCollapsed && (
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-y-auto overscroll-contain lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-none">
      <div className="grid min-h-0 gap-2 overflow-y-auto overscroll-contain border-b border-neutral-800 p-2.5 sm:p-3 lg:border-r lg:border-b-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <button type="button" title="Inicio" aria-label="Inicio" onClick={() => goToFrame(startFrame)} className={iconButtonClass}>
            <SkipBack size={14} />
          </button>
          <button type="button" title="Key anterior" aria-label="Key anterior" onClick={() => goToAdjacentKey(-1)} disabled={selectedFrames.length === 0} className={iconButtonClass}>
            <ChevronLeft size={15} />
          </button>
          <button type="button" title={isPlaying ? 'Pausar' : 'Play'} aria-label={isPlaying ? 'Pausar' : 'Play'} onClick={togglePlayback} className={iconButtonClass}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button type="button" title="Proxima key" aria-label="Proxima key" onClick={() => goToAdjacentKey(1)} disabled={selectedFrames.length === 0} className={iconButtonClass}>
            <ChevronRight size={15} />
          </button>
          <button type="button" title="Fim" aria-label="Fim" onClick={() => goToFrame(endFrame)} className={iconButtonClass}>
            <SkipForward size={14} />
          </button>
          <span className="ml-auto text-xs tabular-nums text-amber-200">{currentFrame}</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <NumberField label="Frame" min={0} max={durationFrames} value={currentFrame} onChange={goToFrame} />
          <NumberField label="Inicio" min={0} max={durationFrames - 1} value={startFrame} onChange={(value) => setFrameRange(value, endFrame)} />
          <NumberField label="Fim" min={1} max={durationFrames} value={endFrame} onChange={(value) => setFrameRange(startFrame, value)} />
          <NumberField label="FPS" min={1} max={120} value={fps} onChange={setFps} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
          <NumberField label="Duracao" min={1} max={24000} value={durationFrames} onChange={setDurationFrames} />
          <label className="grid min-w-0 gap-1">
            <span className={labelClass}>Interp</span>
            <select
              value={selectedKeyframes[0]?.interpolation ?? defaultInterpolation}
              onChange={(event) => setInterpolation(event.target.value as KeyframeInterpolation)}
              className={inputClass}
            >
              {interpolationModes.map((mode) => (
                <option key={mode} value={mode}>
                  {interpolationLabels[mode]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-1">
            <TogglePill active={autoKey} onClick={() => setAutoKey(!autoKey)}>
              Auto
            </TogglePill>
            <TogglePill active={loopPlayback} onClick={() => setLoopPlayback(!loopPlayback)}>
              Loop
            </TogglePill>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={addKeyframe} disabled={!selectedObject} className={smallButtonClass}>
            <Diamond size={12} />
            Key
          </button>
          <button type="button" onClick={() => removeCurrentFrameKeyframes(selectedObjectId)} disabled={!selectedObject || !currentObjectHasKey} className={smallButtonClass}>
            <Trash2 size={12} />
            Frame
          </button>
          <button type="button" onClick={removeSelectedKeyframes} disabled={selectedKeyframeIds.length === 0} className={smallButtonClass}>
            <Trash2 size={12} />
            Sel
          </button>
          <button type="button" onClick={() => duplicateSelectedKeyframes(10)} disabled={selectedKeyframeIds.length === 0} className={smallButtonClass}>
            <Copy size={12} />
            Dup
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => moveSelectedKeyframes(-10)} disabled={selectedKeyframeIds.length === 0} className={smallButtonClass}>
            -10
          </button>
          <button type="button" onClick={() => moveSelectedKeyframes(-1)} disabled={selectedKeyframeIds.length === 0} className={smallButtonClass}>
            -1
          </button>
          <button type="button" onClick={() => moveSelectedKeyframes(1)} disabled={selectedKeyframeIds.length === 0} className={smallButtonClass}>
            +1
          </button>
          <button type="button" onClick={() => moveSelectedKeyframes(10)} disabled={selectedKeyframeIds.length === 0} className={smallButtonClass}>
            +10
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => selectedObjectId && selectObjectKeyframes(selectedObjectId)} disabled={!selectedObjectId || selectedObjectKeyframes.length === 0} className={smallButtonClass}>
            Obj Keys
          </button>
          <button type="button" onClick={() => selectedObjectId && clearObjectKeyframes(selectedObjectId)} disabled={!selectedObjectId || selectedObjectKeyframes.length === 0} className={smallButtonClass}>
            Limpar Obj
          </button>
          <button type="button" onClick={clearAllKeyframes} disabled={keyframes.length === 0} className={smallButtonClass}>
            Limpar Tudo
          </button>
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 grid-cols-[112px_minmax(0,1fr)] overflow-hidden p-2.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-3">
        <div className="min-h-0 overflow-hidden border-r border-neutral-800 pr-2">
          <div className="mb-2 h-6 text-[10px] uppercase tracking-[0.14em] text-neutral-500">Dope Sheet</div>
          <div className="grid max-h-full gap-1 overflow-y-auto overscroll-contain pr-1">
            {lanes.length === 0 ? (
              <div className="truncate rounded-md border border-neutral-800 bg-[#0d0f10] px-2 py-1.5 text-xs text-neutral-500">
                Sem keyframes
              </div>
            ) : (
              lanes.map((objectId) => (
                <button
                  key={objectId}
                  type="button"
                  onClick={() => selectObjectKeyframes(objectId)}
                  onDoubleClick={clearKeyframeSelection}
                  className={`truncate rounded-md border px-2 py-1.5 text-left text-xs transition ${
                    objectId === selectedObjectId
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                      : 'border-neutral-800 bg-[#0d0f10] text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {getKeyframeObjectName(objectId, objects)}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="min-h-0 min-w-0 overflow-hidden pl-3">
          <div className="relative mb-2 h-6 rounded-md border border-neutral-800 bg-[#0d0f10]">
            {marks.map((frame) => (
              <button
                key={frame}
                type="button"
                onClick={() => goToFrame(frame)}
                className="absolute top-0 h-full -translate-x-1/2 cursor-pointer px-1 text-[10px] tabular-nums text-neutral-500 transition hover:text-emerald-200"
                style={{ left: `${((frame - startFrame) / rangeSpan) * 100}%` }}
              >
                {frameToSeconds(frame, fps).toFixed(1)}s
              </button>
            ))}
            <div
              className="pointer-events-none absolute inset-y-0 z-20 w-px bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.35)]"
              style={{ left: `${((currentFrame - startFrame) / rangeSpan) * 100}%` }}
            />
          </div>

          <div className="relative max-h-[calc(100%-3.5rem)] overflow-auto overscroll-contain rounded-md border border-neutral-800 bg-[#0d0f10]">
            <div
              className="pointer-events-none absolute inset-y-0 z-30 w-px bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.35)]"
              style={{ left: `${((currentFrame - startFrame) / rangeSpan) * 100}%` }}
            />
            {lanes.length === 0 ? (
              <div className="grid h-20 place-items-center text-xs text-neutral-600">Adicione um keyframe para iniciar</div>
            ) : (
              lanes.map((objectId) => {
                const laneKeys = keyframes.filter((keyframe) => keyframe.objectId === objectId);

                return (
                  <div key={objectId} className="relative h-8 border-b border-neutral-900 last:border-b-0">
                    <div className="absolute inset-0 grid grid-cols-12">
                      {Array.from({ length: 12 }, (_, index) => (
                        <div key={index} className="border-l border-neutral-900/80" />
                      ))}
                    </div>
                    {laneKeys.map((keyframe) => {
                      const selected = selectedKeyframeIds.includes(keyframe.id);
                      const outsideRange = keyframe.frame < startFrame || keyframe.frame > endFrame;

                      return (
                        <button
                          key={keyframe.id}
                          type="button"
                          title={`${getKeyframeObjectName(keyframe.objectId, objects)} - frame ${keyframe.frame}`}
                          aria-label={`Keyframe ${keyframe.frame}`}
                          onClick={(event) => {
                            selectKeyframe(keyframe.id, event.shiftKey);
                            goToFrame(keyframe.frame);
                          }}
                          onDoubleClick={() => removeKeyframe(keyframe.id)}
                          className={`absolute top-1/2 z-40 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border transition ${
                            selected ? 'border-amber-100 bg-amber-300' : 'border-sky-100 bg-sky-400'
                          } ${outsideRange ? 'opacity-35' : 'opacity-100'}`}
                          style={keyStyle(keyframe)}
                        />
                      );
                    })}
                  </div>
                );
              })
            )}
            <input
              aria-label="Timeline"
              type="range"
              min={startFrame}
              max={endFrame}
              step={1}
              value={Math.max(startFrame, Math.min(endFrame, currentFrame))}
              onChange={(event) => goToFrame(Number(event.target.value))}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div className="mt-2 flex min-h-5 items-center justify-between gap-3 text-[10px] text-neutral-500">
            <span className="truncate">{selectedObject?.name ?? 'Sem selecao'}</span>
            <span className="shrink-0 tabular-nums">
              {selectedKeyframeIds.length} sel / {keyframes.length} keys
            </span>
          </div>
        </div>
      </div>
    </div>
      )}
    </footer>
  );
}
