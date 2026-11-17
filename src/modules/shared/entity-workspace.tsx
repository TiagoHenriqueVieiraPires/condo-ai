"use client";

import { FormEvent, ReactNode, useState } from "react";

export type WorkspaceField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  min?: number;
  step?: number;
  options?: { label: string; value: string }[];
};

export type WorkspaceRow = {
  id: string;
  [key: string]: ReactNode;
};

type EntityWorkspaceProps = {
  title: string;
  description: string;
  fields?: WorkspaceField[];
  columns: { key: string; label: string }[];
  rows: WorkspaceRow[];
  loading?: boolean;
  emptyMessage?: string;
  createLabel?: string;
  externalError?: string;
  externalMessage?: string;
  onCreate?: (values: Record<string, string>) => Promise<void>;
  onCreated?: () => void;
  renderActions?: (row: WorkspaceRow) => ReactNode;
};

export function EntityWorkspace({
  title,
  description,
  fields = [],
  columns,
  rows,
  loading = false,
  emptyMessage = "Nenhum registro cadastrado.",
  createLabel = "Adicionar registro",
  externalError = "",
  externalMessage = "",
  onCreate,
  onCreated,
  renderActions,
}: EntityWorkspaceProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreate) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");
    try {
      await onCreate(values);
      setValues({});
      setMessage("Registro salvo com sucesso.");
      onCreated?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Condo.ai
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">{description}</p>
      </div>

      {(externalError || errorMessage || externalMessage || message) && (
        <p
          aria-live="polite"
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            externalError || errorMessage
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          role={externalError || errorMessage ? "alert" : "status"}
        >
          {externalError || errorMessage || externalMessage || message}
        </p>
      )}

      <div
        className={`mt-8 grid gap-8 ${
          fields.length > 0
            ? "xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
            : ""
        }`}
      >
        {fields.length > 0 && onCreate && (
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {createLabel}
            </h2>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              {fields.map((field) => (
                <label
                  className="grid gap-1.5 text-sm font-medium text-slate-700"
                  key={field.name}
                >
                  {field.label}
                  {field.type === "select" ? (
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                      required={field.required}
                      value={values[field.name] ?? ""}
                    >
                      <option value="">Selecione</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      className="min-h-28 rounded-lg border border-slate-300 px-3 py-2.5"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                      required={field.required}
                      value={values[field.name] ?? ""}
                    />
                  ) : (
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2.5"
                      min={field.min}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                      required={field.required}
                      step={field.step}
                      type={field.type ?? "text"}
                      value={values[field.name] ?? ""}
                    />
                  )}
                </label>
              ))}
              <button
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Salvando..." : createLabel}
              </button>
            </form>
          </section>
        )}

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <span className="text-sm text-slate-500">
              {rows.length} registros
            </span>
          </div>
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Carregando registros...
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {emptyMessage}
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {columns.map((column) => (
                      <th className="whitespace-nowrap px-3 py-3 font-medium" key={column.key}>
                        {column.label}
                      </th>
                    ))}
                    {renderActions && (
                      <th className="px-3 py-3 text-right font-medium">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {columns.map((column) => (
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700" key={column.key}>
                          {row[column.key] ?? "—"}
                        </td>
                      ))}
                      {renderActions && (
                        <td className="px-3 py-3 text-right">
                          {renderActions(row)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
