import type { CouplingPair } from '../types';

// Lightweight radial layout so the "network" is visible without a heavy graph lib.
export function CouplingGraph({ pairs }: { pairs: CouplingPair[] }) {
  if (!pairs.length) return <p className="text-slate-500">No significant temporal coupling found.</p>;
  const files = Array.from(new Set(pairs.flatMap((p) => [p.fileA, p.fileB])));
  const R = 130; const cx = 170; const cy = 160;
  const pos: Record<string, { x: number; y: number }> = {};
  files.forEach((f, i) => {
    const a = (2 * Math.PI * i) / files.length;
    pos[f] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <svg data-testid="coupling-graph" viewBox="0 0 340 340" className="w-full">
        {pairs.map((p, i) => (
          <line key={i} x1={pos[p.fileA].x} y1={pos[p.fileA].y} x2={pos[p.fileB].x} y2={pos[p.fileB].y}
            stroke="#6366f1" strokeWidth={1 + p.strength * 3} strokeOpacity={0.6} />
        ))}
        {files.map((f) => (
          <g key={f}>
            <circle cx={pos[f].x} cy={pos[f].y} r={6} fill="#4338ca" />
            <text x={pos[f].x} y={pos[f].y - 9} textAnchor="middle" className="fill-slate-600" fontSize={8}>
              {f.split('/').pop()}
            </text>
          </g>
        ))}
      </svg>
      <table className="text-sm">
        <thead><tr className="border-b text-left text-slate-500"><th className="py-2">File pair</th><th className="text-right">Shared</th><th className="text-right">Strength</th></tr></thead>
        <tbody>
          {pairs.slice(0, 12).map((p, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-1.5 font-mono text-xs">{p.fileA.split('/').pop()} ↔ {p.fileB.split('/').pop()}</td>
              <td className="text-right">{p.sharedCommits}</td>
              <td className="text-right">{p.strength.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
