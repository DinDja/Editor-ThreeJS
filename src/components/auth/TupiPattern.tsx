type TupiPatternProps = {
  className?: string;
  variant?: 'full' | 'rings' | 'constellation' | 'rhombus';
};

const r = (n: number) => Math.round(n * 100) / 100;

export default function TupiPattern({ className, variant = 'full' }: TupiPatternProps) {
  if (variant === 'rings') {
    const lines = Array.from({ length: 24 }, (_, i) => {
      const angle = (i * Math.PI * 2) / 24;
      return {
        x1: r(200 + Math.cos(angle) * 70),
        y1: r(200 + Math.sin(angle) * 70),
        x2: r(200 + Math.cos(angle) * 190),
        y2: r(200 + Math.sin(angle) * 190),
      };
    });

    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      >
        <g opacity="0.55">
          <circle cx="200" cy="200" r="190" />
          <circle cx="200" cy="200" r="150" />
          <circle cx="200" cy="200" r="110" />
          <circle cx="200" cy="200" r="70" />
        </g>
        <g opacity="0.4">
          {lines.map((line, i) => (
            <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
          ))}
        </g>
        <circle cx="200" cy="200" r="4" fill="currentColor" opacity="0.8" />
      </svg>
    );
  }

  if (variant === 'constellation') {
    const polygons = Array.from({ length: 8 }, (_, ring) => {
      const radius = 40 + ring * 22;
      const points = Array.from({ length: 4 }, (_, i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        return `${r(200 + Math.cos(angle) * radius)},${r(200 + Math.sin(angle) * radius)}`;
      }).join(' ');
      return points;
    });

    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <g opacity="0.45">
          {polygons.map((points, i) => (
            <polygon key={i} points={points} />
          ))}
        </g>
        <g opacity="0.7">
          {[
            [80, 80], [320, 80], [80, 320], [320, 320],
            [200, 40], [200, 360], [40, 200], [360, 200],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" fill="currentColor" />
          ))}
        </g>
        <g opacity="0.3" strokeDasharray="2 6">
          <line x1="80" y1="80" x2="320" y2="320" />
          <line x1="320" y1="80" x2="80" y2="320" />
        </g>
      </svg>
    );
  }

  if (variant === 'rhombus') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
      >
        <g opacity="0.6">
          <path d="M 100 10 L 190 100 L 100 190 L 10 100 Z" />
          <path d="M 100 40 L 160 100 L 100 160 L 40 100 Z" />
          <path d="M 100 70 L 130 100 L 100 130 L 70 100 Z" />
          <line x1="10" y1="100" x2="190" y2="100" />
          <line x1="100" y1="10" x2="100" y2="190" />
        </g>
        <circle cx="100" cy="100" r="3" fill="currentColor" opacity="0.9" />
      </svg>
    );
  }

  const radialLines = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 12;
    return {
      x1: r(300 + Math.cos(angle) * 100),
      y1: r(300 + Math.sin(angle) * 100),
      x2: r(300 + Math.cos(angle) * 280),
      y2: r(300 + Math.sin(angle) * 280),
    };
  });

  const diamonds = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3;
    return Array.from({ length: 4 }, (_, j) => {
      const a = angle + (j * Math.PI) / 2;
      return `${r(300 + Math.cos(a) * 160)},${r(300 + Math.sin(a) * 160)}`;
    }).join(' ');
  });

  const ringDots = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 12;
    return {
      cx: r(300 + Math.cos(angle) * 280),
      cy: r(300 + Math.sin(angle) * 280),
    };
  });

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 600"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      <g opacity="0.5">
        <circle cx="300" cy="300" r="280" />
        <circle cx="300" cy="300" r="220" />
        <circle cx="300" cy="300" r="160" />
        <circle cx="300" cy="300" r="100" />
      </g>
      <g opacity="0.35">
        {radialLines.map((line, i) => (
          <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
        ))}
      </g>
      <g opacity="0.3">
        {diamonds.map((points, i) => (
          <polygon key={i} points={points} />
        ))}
      </g>
      <g opacity="0.7">
        {ringDots.map((dot, i) => (
          <circle key={i} cx={dot.cx} cy={dot.cy} r="3" fill="currentColor" />
        ))}
        <circle cx="300" cy="300" r="5" fill="currentColor" />
      </g>
    </svg>
  );
}
