import { useMemo, useState } from 'react';
import type { ChurnRow } from '../types';

type Key = keyof Pick<ChurnRow, 'commits' | 'linesAdded' | 'linesRemoved' | 'netChange' | 'totalChurn'>;

export function ChurnTable({ rows }: { rows: ChurnRow[] }) {
  const [sortKey, setSortKey] = useState<Key>('commits');
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b[sortKey] - a[sortKey]),
    [rows, sortKey]
  );
  if (!rows.length) return <p className="text-slate-500">No churn data.</p>;
  const cols: { key: Key; label: string }[] = [
    { key: 'commits', label: 'Commits' },
    { key: 'linesAdded', label: 'Added' },
    { key: 'linesRemoved', label: 'Removed' },
    { key: 'netChange', label: 'Net' },
    { key: 'totalChurn', label: 'Total churn' }
  ];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-slate-500">
          <th className="py-2">File</th>
          {cols.map((c) => (
            <th key={c.key} className="cursor-pointer py-2 text-right" onClick={() => setSortKey(c.key)}>
              {c.label}{sortKey === c.key ? ' ▼' : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.filePath} className="border-b border-slate-100">
            <td className="py-1.5 font-mono text-xs">{r.filePath}</td>
            <td className="text-right">{r.commits}</td>
            <td className="text-right text-emerald-600">+{r.linesAdded}</td>
            <td className="text-right text-rose-600">-{r.linesRemoved}</td>
            <td className="text-right">{r.netChange}</td>
            <td className="text-right">{r.totalChurn}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
