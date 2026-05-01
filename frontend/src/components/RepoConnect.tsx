import { useState } from 'react';

export function RepoConnect({ onConnect, busy }: { onConnect: (url: string) => void; busy?: boolean }) {
  const [url, setUrl] = useState('');
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => { e.preventDefault(); if (url.trim()) onConnect(url.trim()); }}
    >
      <input
        aria-label="Repository URL"
        className="flex-1 rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
        placeholder="https://github.com/owner/repo"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Analyzing…' : 'Analyze repository'}
      </button>
    </form>
  );
}
