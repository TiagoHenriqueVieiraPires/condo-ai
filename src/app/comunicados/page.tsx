"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EntityWorkspace,
  type WorkspaceField,
  type WorkspaceRow,
} from "@/modules/shared/entity-workspace";
import { ScopeGate } from "@/modules/shared/scope-gate";
import { useCondominiumScope } from "@/modules/shared/use-condominium";
import type { Tables } from "@/types/database.types";

type Announcement = Pick<
  Tables<"announcements">,
  "id" | "title" | "body" | "author_id" | "created_at"
>;

export default function AnnouncementsPage() {
  const scope = useCondominiumScope();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const isManager = scope.role === "administrator" || scope.role === "syndic";

  useEffect(() => {
    if (!scope.client || !scope.condominium) {
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setLoadError("");
      const { data, error } = await scope.client!
        .from("announcements")
        .select("id, title, body, author_id, created_at")
        .eq("condominium_id", scope.condominium!.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (!active) {
        return;
      }
      if (error) {
        setLoadError(error.message);
      } else {
        setAnnouncements(data ?? []);
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [refreshKey, scope.client, scope.condominium]);

  const fields: WorkspaceField[] = [
    { name: "title", label: "Título", required: true },
    {
      name: "body",
      label: "Comunicado",
      type: "textarea",
      required: true,
    },
  ];
  const rows: WorkspaceRow[] = announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    message:
      announcement.body.length > 180
        ? `${announcement.body.slice(0, 177)}...`
        : announcement.body,
    published: new Date(announcement.created_at).toLocaleString("pt-BR"),
    author_id: announcement.author_id,
  }));

  const createAnnouncement = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !isManager) {
        throw new Error("Seu perfil não pode publicar comunicados.");
      }
      const { error } = await scope.client.from("announcements").insert({
        condominium_id: scope.condominium.id,
        title: values.title.trim(),
        body: values.body.trim(),
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [isManager, scope.client, scope.condominium],
  );

  async function archiveAnnouncement(announcementId: string) {
    if (!scope.client) {
      return;
    }
    setActionError("");
    const { error } = await scope.client
      .from("announcements")
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcementId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setRefreshKey((key) => key + 1);
  }

  return (
    <ScopeGate scope={scope}>
      <EntityWorkspace
        columns={[
          { key: "title", label: "Título" },
          { key: "message", label: "Comunicado" },
          { key: "published", label: "Publicado em" },
        ]}
        description="Compartilhe avisos relevantes com todos os moradores e equipes."
        emptyMessage="Nenhum comunicado publicado."
        externalError={actionError || loadError}
        fields={isManager ? fields : []}
        loading={loading}
        onCreate={isManager ? createAnnouncement : undefined}
        onCreated={() => setRefreshKey((key) => key + 1)}
        renderActions={
          isManager
            ? (row) =>
                row.author_id === scope.userId ? (
                  <button
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => void archiveAnnouncement(row.id)}
                    type="button"
                  >
                    Arquivar
                  </button>
                ) : null
            : undefined
        }
        rows={rows}
        title="Comunicados"
      />
    </ScopeGate>
  );
}
