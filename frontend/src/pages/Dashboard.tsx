import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Repository, Snapshot, ChurnRow, Hotspot, CouplingPair, OwnershipFile, AuthorSummary } from '../types';
import { RepoConnect } from '../components/RepoConnect';
import { StatusBadge } from '../components/StatusBadge';
import { ChurnTable } from '../components/ChurnTable';
import { HotspotScatter } from '../components/HotspotScatter';
import { CouplingGraph } from '../components/CouplingGraph';
import { OwnershipTree } from '../components/OwnershipTree';

const TABS = ['Churn', 'Hotspots', 'Coupling', 'Ownership'] as const;
type Tab = typeof TABS[number];

export function Dashboard() {
  const [repo, setRepo] = useState<Repository | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Churn');
  const [churn, setChurn] = useState<ChurnRow[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [coupling, setCoupling] = useState<CouplingPair[]>([]);
  const [ownership, setOwnership] = useState<{ files: OwnershipFile[]; authors: AuthorSummary[] }>({ files: [], authors: [] });

  const connect = useCallback(async (url: string) => {
    setError(null); setSnapshot(null);
    try { setRepo(await api.connectRepository(url)); }
    catch (e: any) { setError(e.message); }
  }, []);

  // Poll status until analysis completes or fails.
  useEffect(() => {
    if (!repo || repo.status === 'completed' || repo.status === 'failed') return;
    const t = setInterval(async () => {
      const { repository, snapshots } = await api.getRepository(repo.id);
      setRepo(repository);
      if (repository.status === 'completed' && snapshots[0]) setSnapshot(snapshots[0]);
      if (repository.status === 'failed') setError(repository.error_message || 'Analysis failed');
    }, 1000);
    return () => clearInterval(t);
  }, [repo]);

  // Load analysis results once a snapshot is available.
  useEffect(() => {
    if (!snapshot) return;
    api.getChurn(snapshot.id, 'all').then((r) => setChurn(r.churn));
    api.getHotspots(snapshot.id, 'all').then((r) => setHotspots(r.hotspots));
    api.getCoupling(snapshot.id).then((r) => setCoupling(r.pairs));
    api.getOwnership(snapshot.id).then(setOwnership);
  }, [snapshot]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Codegraph</h1>
        <p className="text-slate-500">Git Repository Health Analyzer</p>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <RepoConnect onConnect={connect} busy={!!repo && repo.status !== 'completed' && repo.status !== 'failed'} />
        {repo && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="font-medium">{repo.name}</span>
            <StatusBadge status={repo.status} />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </section>

      {snapshot && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <nav className="mb-4 flex gap-2 border-b">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </nav>
          {tab === 'Churn' && <ChurnTable rows={churn} />}
          {tab === 'Hotspots' && <HotspotScatter hotspots={hotspots} />}
          {tab === 'Coupling' && <CouplingGraph pairs={coupling} />}
          {tab === 'Ownership' && <OwnershipTree files={ownership.files} authors={ownership.authors} />}
        </section>
      )}
    </main>
  );
}
