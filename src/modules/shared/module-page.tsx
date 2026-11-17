type ModulePageProps = {
  title: string;
  description: string;
};

export function ModulePage({
  title,
  description,
}: ModulePageProps) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Condo.ai
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">{description}</p>
      <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">
        Este módulo será implementado nas próximas etapas.
      </div>
    </main>
  );
}
