import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  useRateTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "../../hooks/useRateTemplates";
import type { RateTemplateListItem } from "../../api/rate-templates";

export default function RateTemplatesPage() {
  const { data: templates = [], isLoading, isError, error } = useRateTemplates();
  const createMut = useCreateTemplate();
  const updateMut = useUpdateTemplate();
  const deleteMut = useDeleteTemplate();

  const [dialog, setDialog] = useState<
    | { mode: "create" }
    | { mode: "create-copy"; source: RateTemplateListItem }
    | { mode: "edit"; source: RateTemplateListItem }
    | null
  >(null);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const openCreate = () => {
    setName("");
    setNotes("");
    setDialog({ mode: "create" });
  };

  const openCopy = (t: RateTemplateListItem) => {
    setName(`${t.name} (копия)`);
    setNotes("");
    setDialog({ mode: "create-copy", source: t });
  };

  const openEdit = (t: RateTemplateListItem) => {
    setName(t.name);
    setNotes(t.notes ?? "");
    setDialog({ mode: "edit", source: t });
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      alert("Название минимум 2 символа");
      return;
    }
    if (dialog?.mode === "create") {
      createMut.mutate(
        { name: trimmed, notes: notes.trim() || null },
        {
          onSuccess: () => setDialog(null),
          onError: (e: any) => alert(e?.response?.data?.error ?? "Не удалось создать"),
        },
      );
    } else if (dialog?.mode === "create-copy") {
      createMut.mutate(
        {
          name: trimmed,
          notes: notes.trim() || null,
          copyFromTemplateId: dialog.source.id,
        },
        {
          onSuccess: () => setDialog(null),
          onError: (e: any) => alert(e?.response?.data?.error ?? "Не удалось создать"),
        },
      );
    } else if (dialog?.mode === "edit") {
      updateMut.mutate(
        {
          id: dialog.source.id,
          patch: { name: trimmed, notes: notes.trim() || null },
        },
        {
          onSuccess: () => setDialog(null),
          onError: (e: any) => alert(e?.response?.data?.error ?? "Не удалось сохранить"),
        },
      );
    }
  };

  const handleDelete = (t: RateTemplateListItem) => {
    if (t.animatorsCount > 0) {
      alert(`Нельзя удалить: шаблон используется ${t.animatorsCount} аниматором(ами)`);
      return;
    }
    if (!window.confirm(`Удалить шаблон «${t.name}»?`)) return;
    deleteMut.mutate(t.id, {
      onError: (e: any) => alert(e?.response?.data?.error ?? "Не удалось удалить"),
    });
  };

  const handleToggleActive = (t: RateTemplateListItem) => {
    updateMut.mutate(
      { id: t.id, patch: { isActive: !t.isActive } },
      { onError: (e: any) => alert(e?.response?.data?.error ?? "Не удалось") },
    );
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-gray-500">
          Всего: <span className="font-semibold text-gray-800">{templates.length}</span>
        </div>
        <Button onClick={openCreate}>+ Создать шаблон</Button>
      </div>

      {isLoading ? (
        <Card><div className="p-10 text-center text-gray-500">Загрузка…</div></Card>
      ) : isError ? (
        <Card>
          <div className="p-10 text-center text-red-600">
            Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
          </div>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <div className="p-10 text-center text-gray-500">
            Нет шаблонов. Создайте первый — например, «Новичок».
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3 w-[130px] text-center">Ставок</th>
                <th className="px-4 py-3 w-[150px] text-center">Аниматоров</th>
                <th className="px-4 py-3 w-[120px] text-center">Статус</th>
                <th className="px-4 py-3 w-[200px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((t) => (
                <tr key={t.id} className={!t.isActive ? "opacity-60" : ""}>
                  <td className="px-4 py-3">
                    <Link
                      to={`/animators/templates/${t.id}`}
                      className="font-semibold text-gray-900 hover:text-primary"
                    >
                      {t.name}
                    </Link>
                    {t.notes ? (
                      <div className="text-xs text-gray-500 mt-0.5">{t.notes}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{t.ratesCount}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{t.animatorsCount}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(t)}
                      disabled={busy}
                      title={t.isActive ? "Деактивировать" : "Активировать"}
                    >
                      <Badge variant={t.isActive ? "success" : "default"}>
                        {t.isActive ? "Активен" : "Архив"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Link to={`/animators/templates/${t.id}`}>
                        <Button variant="ghost" size="sm" className="!px-2" title="Редактировать">
                          <Pencil size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        title="Дублировать"
                        onClick={() => openCopy(t)}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        title="Переименовать"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2 text-red-600 hover:text-red-700"
                        title="Удалить"
                        onClick={() => handleDelete(t)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "create"
                ? "Новый шаблон"
                : dialog?.mode === "create-copy"
                  ? "Копия шаблона"
                  : "Переименовать шаблон"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Название</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Новичок"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Заметка</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: для стажёров до 3 месяцев"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
