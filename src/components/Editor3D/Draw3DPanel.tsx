'use client';

import { useEditorStore } from '@/store/editorStore';
import type { Draw3DMode, Draw3DPlane } from '@/store/types';

const modeLabels: Record<Draw3DMode, string> = {
  stroke: 'Stroke',
  polyline: 'Polyline',
  shape: 'Shape',
  surface: 'Surface',
  extrude: 'Extrude',
};

const planeLabels: Record<Draw3DPlane, string> = {
  camera: 'Camera',
  xy: 'XY',
  xz: 'XZ',
  yz: 'YZ',
  surface: 'Surface',
};

const modes: Draw3DMode[] = ['stroke', 'polyline', 'shape', 'surface', 'extrude'];
const planes: Draw3DPlane[] = ['xz', 'xy', 'yz', 'camera', 'surface'];

const labelClass = 'block text-[10px] uppercase tracking-[0.12em] text-neutral-500 mb-1';
const inputClass = 'h-7 w-full rounded border border-neutral-700/60 bg-neutral-900 px-2 text-[11px] text-neutral-200 outline-none transition-colors hover:border-neutral-600 focus:border-emerald-500';
const selectClass = 'h-7 w-full appearance-none rounded border border-neutral-700/60 bg-neutral-900 pl-2 pr-6 text-[11px] text-neutral-200 outline-none transition-colors hover:border-neutral-600 focus:border-emerald-500 cursor-pointer';
const rowClass = 'mb-3';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">{title}</div>
      {children}
    </div>
  );
}

export default function Draw3DPanel() {
  const config = useEditorStore((state) => state.draw3DConfig);
  const setDraw3DConfig = useEditorStore((state) => state.setDraw3DConfig);
  const draw3DSnapEnabled = useEditorStore((state) => state.draw3DSnapEnabled);
  const setDraw3DSnapEnabled = useEditorStore((state) => state.setDraw3DSnapEnabled);

  return (
    <div className="px-3 py-2">
      <Section title="Draw Mode">
        <div className={rowClass}>
          <select
            value={config.mode}
            onChange={(e) => setDraw3DConfig({ mode: e.target.value as Draw3DMode })}
            className={selectClass}
          >
            {modes.map((m) => (
              <option key={m} value={m}>{modeLabels[m]}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Drawing Plane">
        <div className={rowClass}>
          <select
            value={config.plane}
            onChange={(e) => setDraw3DConfig({ plane: e.target.value as Draw3DPlane })}
            className={selectClass}
          >
            {planes.map((p) => (
              <option key={p} value={p}>{planeLabels[p]}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Stroke">
        <div className={rowClass}>
          <label className={labelClass}>Radius</label>
          <input
            type="range"
            min={0.01}
            max={1}
            step={0.01}
            value={config.radius}
            onChange={(e) => setDraw3DConfig({ radius: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <span className="text-[10px] text-neutral-500">{config.radius.toFixed(2)}</span>
        </div>

        {(config.mode === 'stroke') && (
          <div className={rowClass}>
            <label className={labelClass}>Smoothing</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.smoothing}
              onChange={(e) => setDraw3DConfig({ smoothing: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <span className="text-[10px] text-neutral-500">{config.smoothing.toFixed(2)}</span>
          </div>
        )}

        <div className={rowClass}>
          <label className={labelClass}>Segments</label>
          <input
            type="range"
            min={4}
            max={128}
            step={4}
            value={config.tubularSegments}
            onChange={(e) => setDraw3DConfig({ tubularSegments: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <span className="text-[10px] text-neutral-500">{config.tubularSegments}</span>
        </div>

        <div className={rowClass}>
          <label className={labelClass}>Radial Segments</label>
          <input
            type="range"
            min={3}
            max={32}
            step={1}
            value={config.radialSegments}
            onChange={(e) => setDraw3DConfig({ radialSegments: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <span className="text-[10px] text-neutral-500">{config.radialSegments}</span>
        </div>
      </Section>

      {config.mode === 'extrude' && (
        <Section title="Extrude">
          <div className={rowClass}>
            <label className={labelClass}>Depth</label>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={config.extrudeDepth}
              onChange={(e) => setDraw3DConfig({ extrudeDepth: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <span className="text-[10px] text-neutral-500">{config.extrudeDepth.toFixed(1)}</span>
          </div>
        </Section>
      )}

      <Section title="Material">
        <div className={rowClass}>
          <label className={labelClass}>Color</label>
          <input
            type="color"
            value={config.color}
            onChange={(e) => setDraw3DConfig({ color: e.target.value })}
            className="h-7 w-full cursor-pointer rounded border border-neutral-700/60 bg-neutral-900"
          />
        </div>

        <div className={rowClass}>
          <label className={labelClass}>Metalness</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={config.metalness}
            onChange={(e) => setDraw3DConfig({ metalness: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <span className="text-[10px] text-neutral-500">{config.metalness.toFixed(2)}</span>
        </div>

        <div className={rowClass}>
          <label className={labelClass}>Roughness</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={config.roughness}
            onChange={(e) => setDraw3DConfig({ roughness: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <span className="text-[10px] text-neutral-500">{config.roughness.toFixed(2)}</span>
        </div>
      </Section>

      <Section title="Options">
        {(config.mode === 'shape' || config.mode === 'surface') && (
          <div className={rowClass}>
            <label className="flex items-center gap-2 text-[11px] text-neutral-300">
              <input
                type="checkbox"
                checked={config.autoClose}
                onChange={(e) => setDraw3DConfig({ autoClose: e.target.checked })}
                className="accent-emerald-500"
              />
              Auto-close outline
            </label>
          </div>
        )}

        <div className={rowClass}>
          <label className="flex items-center gap-2 text-[11px] text-neutral-300">
            <input
              type="checkbox"
              checked={draw3DSnapEnabled}
              onChange={(e) => setDraw3DSnapEnabled(e.target.checked)}
              className="accent-emerald-500"
            />
            Snap to grid
          </label>
        </div>
      </Section>

      <div className="mt-3 border-t border-neutral-800 pt-3 text-[10px] text-neutral-600">
        {config.mode === 'stroke' && <p>Click & drag to draw a stroke. Release to finish.</p>}
        {config.mode === 'polyline' && <p>Click to add points. Right-click or Enter to finish. Esc to cancel.</p>}
        {(config.mode === 'shape' || config.mode === 'surface' || config.mode === 'extrude') && (
          <p>Click to add points. Click near first point or right-click/Enter to close. Esc to cancel.</p>
        )}
      </div>
    </div>
  );
}
