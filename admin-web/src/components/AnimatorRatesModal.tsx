import { useEffect, useMemo, useState } from "react";
import { RATE_DURATIONS, formatDuration } from "@event-agency/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { useRateGroups } from "../hooks/useRateGroups";
import { useCharacters } from "../hooks/useCharacters";
import {
  useRateTemplates,
  useRateTemplate,
  useAssignTemplate,
  useOverrides,
  useSaveOverrides,
} from "../hooks/useRateTemplates";
import type { OverrideCell } from "../api/rate-templates";

type Props = {
  open: boolean;
  animatorId: string;
  animatorName: string;
  onClose: () => void;
};

function cellKey(characterId: string, durationMin: number): string {
  return `${characterId}|${durationMin}`;
}

function tplKey(rateGroupId: string, durationMin: number): string {
  return `${rateGroupId}|${durationMin}`;
}

export function AnimatorRatesModal({ open, animatorId, animatorName, onClose }: Props) {
  const { data: templates = [] } = useRateTemplates();
  const { data: overridesResp } = useOverrides(open ? animatorId : undefined);
  const assignMut = useAssignTemplate();
  const saveOvMut = useSaveOverrides();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    if (overridesResp) {
      setSelectedTemplateId(overridesResp.templateId ?? "");
    }
  }, [overridesResp?.templateId]);

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.isActive),
    [templates],
  );

  const initialTemplateId = overridesResp?.templateId ?? "";
  const templateDirty = selectedTemplateId !== initialTemplateId;

  const handleSaveTemplate = () => {
    const nextId = selectedTemplateId === "" ? null : selectedTemplateId;
    assignMut.mutate(
      { animatorId, templateId: nextId },
      {
        onSuccess: (r) => {
          alert(`Шаблон сохранён.\nПересчитано будущих назначений: ${r.affectedAssignments}`);
        },
        onError: (e: any) => alert(e?.response?.data?.error ?? "Не удалось сохранить"),
      },
    );
  };

  // ==== Override ====
  const { data: groups = [] } = useRateGroups(true);
  const { data: charsResp } = useCharacters();
  const chars = Array.isArray(charsResp) ? charsResp : ((charsResp as any)?.items ?? []);

  const activeGroups = useMemo(
    () => groups.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [groups],
  );

  // Персонажи по группам
  const charsByGroup = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const c of chars) {
      if (!map[c.rateGroupId]) map[c.rateGroupId] = [];
      map[c.rateGroupId].push(c);
    }
    return map;
  }, [chars]);

  // initial overrides (что на сервере)
  const initialOverrides = useMemo(() => {
    const map: Record<string, number> = {};
    if (!overridesResp) return map;
    for (const c of overridesResp.cells) {
      map[cellKey(c.characterId, c.durationMin)] = c.amount;
    }
    return map;
  }, [overridesResp]);

  const [ovDraft, setOvDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(initialOverrides)) {
      d[k] = String(v);
    }
    setOvDraft(d);
  }, [initialOverrides, open]);

  const setOvCell = (k: string, v: string) => {
    setOvDraft((prev) => ({ ...prev, [k]: v }));
  };

  // Ставки шаблона (по группам) для превью
  const { data: tplDetail } = useRateTemplate(
    selectedTemplateId || undefined,
  );

  const tplCellsMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!tplDetail) return map;
    for (const c of tplDetail.cells) {
      map[tplKey(c.rateGroupId, c.durationMin)] = c.amount;
    }
    return map;
  }, [tplDetail]);

  const ovHasChanges = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(initialOverrides),
      ...Object.keys(ovDraft).filter((k) => ovDraft[k] !== ""),
    ]);
    for (const k of allKeys) {
      const before = initialOverrides[k];
      const raw = ovDraft[k] ?? "";
      const after = raw === "" ? undefined : Number(raw.replace(",", "."));
      if ((before ?? undefined) !== (after ?? undefined)) return true;
    }
    return false;
  }, [initialOverrides, ovDraft]);

  const handleSaveOverrides = async () => {
    const cells: OverrideCell[] = [];
    for (const [k, raw] of Object.entries(ovDraft)) {
      if (raw === "") continue;
      const [characterId, durStr] = k.split("|");
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        alert(`Некорректное значение: ${raw}`);
        return;
      }
      cells.push({ characterId, durationMin: Number(durStr), amount: n });
    }
    try {
      const res = await saveOvMut.mutateAsync({ animatorId, cells });
      alert(`Переопределения сохранены.\nОбновлено будущих назначений: ${res.affectedAssignments}`);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Не удалось сохранить");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ставки — {animatorName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* === Шаблон === */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Шаблон ставок</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="flex-1 min-w-[260px]"
              >
                <option value="">— Без шаблона (payout вводится вручную) —</option>
                {activeTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.ratesCount} ставок)
                  </option>
                ))}
              </Select>
              <Button
                onClick={handleSaveTemplate}
                disabled={!templateDirty || assignMut.isPending}
              >
                {assignMut.isPending ? "Сохраняю…" : "Сохранить шаблон"}
              </Button>
            </div>
            {tplDetail ? (
              <div className="text-xs text-gray-500 mt-2">
                Аниматоров на этом шаблоне: {tplDetail.animators.length}, ставок: {tplDetail.cells.length}
              </div>
            ) : null}
          </section>

          {/* === Overrides === */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Переопределения</h3>
            <p className="text-xs text-gray-500 mb-3">
              Точечная замена ставки для конкретного персонажа. Если пусто — берётся из шаблона.
            </p>

            {!selectedTemplateId ? (
              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                Сначала назначьте шаблон — без него переопределения не применяются.
              </div>
            ) : activeGroups.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                Нет активных групп персонажей
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-600 min-w-[180px] sticky left-0 bg-gray-50 z-10">
                        Персонаж
                      </th>
                      {RATE_DURATIONS.map((d) => (
                        <th key={d} className="px-1 py-1.5 font-semibold text-gray-600 text-center w-[90px] whitespace-nowrap">
                          {formatDuration(d)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeGroups.map((g) => {
                      const list = charsByGroup[g.id] ?? [];
                      if (list.length === 0) return null;
                      return (
                        <>
                          <tr key={`g-${g.id}`} className="bg-gray-50/50">
                            <td
                              colSpan={RATE_DURATIONS.length + 1}
                              className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-500 font-bold sticky left-0"
                            >
                              {g.name}
                            </td>
                          </tr>
                          {list.map((c: any) => (
                            <tr key={c.id}>
                              <td className="px-2 py-1 sticky left-0 bg-white z-10">
                                <div className="text-gray-800 font-medium truncate max-w-[170px]">
                                  {c.name}
                                </div>
                              </td>
                              {RATE_DURATIONS.map((d) => {
                                const k = cellKey(c.id, d);
                                const v = ovDraft[k] ?? "";
                                const base = tplCellsMap[tplKey(g.id, d)];
                                return (
                                  <td key={d} className="px-1 py-0.5">
                                    <Input
                                      type="number"
                                      min={0}
                                      step={100}
                                      value={v}
                                      onChange={(e) => setOvCell(k, e.target.value)}
                                      placeholder={base !== undefined ? String(base) : "—"}
                                      className="!h-7 !px-1 text-right text-xs"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedTemplateId && activeGroups.length > 0 ? (
              <div className="flex items-center justify-end gap-2 mt-3">
                {ovHasChanges ? (
                  <span className="text-xs text-amber-600 font-medium">Есть изменения</span>
                ) : null}
                <Button
                  onClick={handleSaveOverrides}
                  disabled={!ovHasChanges || saveOvMut.isPending}
                >
                  {saveOvMut.isPending ? "Сохраняю…" : "Сохранить переопределения"}
                </Button>
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex items-center justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
