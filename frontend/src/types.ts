export interface Repository {
  id: number; url: string; name: string;
  status: 'pending' | 'cloning' | 'analyzing' | 'completed' | 'failed';
  error_message: string | null;
}
export interface Snapshot { id: number; repository_id: number; commit_count: number; file_count: number; created_at: number; }
export interface ChurnRow { filePath: string; commits: number; linesAdded: number; linesRemoved: number; netChange: number; totalChurn: number; }
export interface Hotspot { filePath: string; changeFrequency: number; loc: number; totalChurn: number; score: number; normalizedScore: number; }
export interface CouplingPair { fileA: string; fileB: string; sharedCommits: number; strength: number; }
export interface OwnershipFile { filePath: string; owner: string; ownerShare: number; totalChanges: number; authorCount: number; classification: 'single-owner' | 'shared' | 'abandoned'; lastChangedAt: number; }
export interface AuthorSummary { author: string; name: string; commits: number; filesTouched: number; }
export interface HotspotDiff {
  added: { filePath: string; score: number }[];
  removed: { filePath: string; score: number }[];
  increased: { filePath: string; before: number; after: number; delta: number }[];
  decreased: { filePath: string; before: number; after: number; delta: number }[];
  summary: { newHotspots: number; resolvedHotspots: number; worsened: number; improved: number; netScoreDelta: number };
}
