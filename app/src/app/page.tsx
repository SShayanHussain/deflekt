export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-950 p-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl">
        {/* Logo mark */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl font-bold text-white shadow-lg shadow-cyan-500/25">
          D
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">
          Deflekt
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Answer the tickets you shouldn&apos;t have to.
        </p>

        <div className="mt-8 rounded-lg border border-slate-700/50 bg-slate-800/50 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-widest text-cyan-400">
            Phase 0 · Skeleton
          </p>
          <p className="mt-1 text-sm text-slate-300">
            All services running. Ready for Phase 1.
          </p>
        </div>

        <div className="mt-6 flex justify-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            App
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            AI Service
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Postgres
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Redis
          </span>
        </div>
      </div>
    </main>
  );
}
