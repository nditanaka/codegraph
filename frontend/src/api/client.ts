import type { Repository, Snapshot, ChurnRow, Hotspot, CouplingPair, OwnershipFile, AuthorSummary, HotspotDiff } from '../types';

const BASE = (import.meta as any).env?.VITE_API_BASE ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async connectRepository(url: string, token?: string, name?: string): Promise<Repository> {
    const res = await fetch(`${BASE}/api/repositories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name, token })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to connect repository');
    return body.repository as Repository;
  },
  getRepository: (id: number) => get<{ repository: Repository; snapshots: Snapshot[] }>(`/api/repositories/${id}`),
  listRepositories: () => get<{ repositories: Repository[] }>('/api/repositories'),
  getChurn: (snap: number, window = '90') => get<{ churn: ChurnRow[] }>(`/api/snapshots/${snap}/churn?window=${window}`),
  getHotspots: (snap: number, window = '90') => get<{ hotspots: Hotspot[] }>(`/api/snapshots/${snap}/hotspots?window=${window}`),
  getCoupling: (snap: number, minShared = 2) => get<{ pairs: CouplingPair[]; graph: { nodes: { id: string }[]; edges: any[] } }>(`/api/snapshots/${snap}/coupling?minShared=${minShared}`),
  getOwnership: (snap: number) => get<{ files: OwnershipFile[]; authors: AuthorSummary[] }>(`/api/snapshots/${snap}/ownership`),
  getSummary: (snap: number) => get<{ snapshot: Snapshot; metrics: any }>(`/api/snapshots/${snap}/summary`),
  compare: (prev: number, curr: number) => get<{ diff: HotspotDiff }>(`/api/compare?prev=${prev}&curr=${curr}`)
};
