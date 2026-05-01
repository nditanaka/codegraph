import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Hotspot } from '../types';

export function HotspotScatter({ hotspots }: { hotspots: Hotspot[] }) {
  if (!hotspots.length) return <p className="text-slate-500">No hotspot data.</p>;
  const data = hotspots.map((h) => ({ x: h.changeFrequency, y: h.loc, z: h.score, name: h.filePath }));
  return (
    <div>
      <div data-testid="hotspot-chart" style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey="x" name="Change frequency" label={{ value: 'Change frequency (commits)', position: 'bottom' }} />
            <YAxis type="number" dataKey="y" name="Size (LOC)" label={{ value: 'File size (LOC)', angle: -90, position: 'insideLeft' }} />
            <ZAxis type="number" dataKey="z" range={[60, 400]} name="Hotspot score" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill="#dc2626" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">Upper-right = highest risk (frequently changed AND large).</p>
    </div>
  );
}
