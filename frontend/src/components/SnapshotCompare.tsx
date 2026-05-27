import type { HotspotDiff } from '../types';

export function SnapshotCompare({ diff }: { diff: HotspotDiff }) {
  const s = diff.summary;
  const Card = ({ label, value, tone }: { label: string; value: number; tone: string }) => (
    <div className={`rounded-lg p-3 text-center ${tone}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="New hotspots" value={s.newHotspots} tone="bg-rose-50 text-rose-700" />
        <Card label="Resolved" value={s.resolvedHotspots} tone="bg-emerald-50 text-emerald-700" />
        <Card label="Worsened" value={s.worsened} tone="bg-amber-50 text-amber-700" />
        <Card label="Improved" value={s.improved} tone="bg-sky-50 text-sky-700" />
      </div>
      <p className={`text-sm font-medium ${s.netScoreDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
        Net risk {s.netScoreDelta > 0 ? 'increased' : 'decreased'} ({s.netScoreDelta > 0 ? '+' : ''}{s.netScoreDelta})
      </p>
    </div>
  );
}
