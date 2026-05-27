import type { OwnershipFile, AuthorSummary } from '../types';

const STYLE: Record<OwnershipFile['classification'], string> = {
  'single-owner': 'border-l-4 border-rose-400 bg-rose-50',
  shared: 'border-l-4 border-emerald-400 bg-emerald-50',
  abandoned: 'border-l-4 border-slate-400 bg-slate-100'
};

export function OwnershipTree({ files, authors }: { files: OwnershipFile[]; authors: AuthorSummary[] }) {
  if (!files.length) return <p className="text-slate-500">No ownership data.</p>;
  const groups: OwnershipFile['classification'][] = ['single-owner', 'shared', 'abandoned'];
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        {groups.map((g) => {
          const items = files.filter((f) => f.classification === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <h4 className="mb-1 text-sm font-semibold capitalize text-slate-600">{g} ({items.length})</h4>
              <ul className="space-y-1">
                {items.slice(0, 15).map((f) => (
                  <li key={f.filePath} className={`rounded px-3 py-1.5 text-xs ${STYLE[f.classification]}`}>
                    <span className="font-mono">{f.filePath}</span>
                    <span className="ml-2 text-slate-500">{f.owner} · {(f.ownerShare * 100).toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div>
        <h4 className="mb-1 text-sm font-semibold text-slate-600">Contributors</h4>
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left text-slate-500"><th className="py-1">Author</th><th className="text-right">Commits</th><th className="text-right">Files</th></tr></thead>
          <tbody>
            {authors.map((a) => (
              <tr key={a.author} className="border-b border-slate-100">
                <td className="py-1">{a.name || a.author}</td>
                <td className="text-right">{a.commits}</td>
                <td className="text-right">{a.filesTouched}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
