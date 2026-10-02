import { useMemo, useState } from "react";
import type { Character } from "../../api/types";
import {
  useCharacters,
  useDeleteCharacter,
} from "../../hooks/useCharacters";
import { useRateGroups } from "../../hooks/useRateGroups";
import { useDebounce } from "../../hooks/useDebounce";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { CharacterModal } from "../../components/CharacterModal";

function fmtMoney(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function priceRange(c: Character): string {
  const active = (c.priceOptions ?? []).filter((p) => p.isActive);
  if (active.length === 0) return "—";
  const nums = active.map((p) => Number(p.price));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return `${fmtMoney(min)} ₽`;
  return `${fmtMoney(min)} – ${fmtMoney(max)} ₽`;
}

export default function CharactersPage() {
  const { data: groups = [] } = useRateGroups(true);

  const [groupId, setGroupId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const search = useDebounce(searchInput, 400);

  const params = useMemo(
    () => ({
      includeInactive: includeInactive || undefined,
      rateGroupId: groupId || undefined,
      search: search.trim() || undefined,
    }),
    [includeInactive, groupId, search],
  );

  const { data: chars = [], isLoading, isError, error } = useCharacters(params);
  const deleteMut = useDeleteCharacter();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);

  const groupsSorted = useMemo(
    () => [...groups].sort((a, b) => a.sortOrder - b.sortOrder),
    [groups],
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: Character) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleDelete = (c: Character) => {
    if (!window.confirm(`Удалить персонажа «${c.name}»?`)) return;
    deleteMut.mutate(c.id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось удалить персонажа"),
    });
  };

  const activeFiltersCount =
    (groupId ? 1 : 0) + (searchInput.trim() ? 1 : 0) + (includeInactive ? 1 : 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-500">
              Всего: <span className="font-semibold text-gray-800">{chars.length}</span>
              {activeFiltersCount > 0 ? (
                <span className="ml-2 text-xs text-gray-400">
                  (фильтров: {activeFiltersCount})
                </span>
              ) : null}
            </div>
            <Button onClick={openCreate}>+ Добавить персонажа</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Поиск по имени"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">Все группы</option>
              {groupsSorted.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 md:col-span-2">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Показывать неактивных
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Загрузка…</div>
        ) : isError ? (
          <div className="p-10 text-center text-red-600">
            Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
          </div>
        ) : chars.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Персонажей не найдено</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Персонаж</TableHead>
                <TableHead className="w-[200px]">Группа</TableHead>
                <TableHead className="w-[110px] text-center">Длит.</TableHead>
                <TableHead className="w-[200px] text-right">Цены</TableHead>
                <TableHead className="w-[110px]">Статус</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chars.map((c) => {
                const opts = (c.priceOptions ?? []).filter((p) => p.isActive);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-gray-900">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {c.rateGroup?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {opts.length || "—"}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 whitespace-nowrap">
                      {priceRange(c)}
                    </TableCell>
                    <TableCell>
                      {c.isActive ? (
                        <Badge variant="success">Активен</Badge>
                      ) : (
                        <Badge variant="default">Выключен</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2"
                          title="Изменить"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2 text-red-600 hover:text-red-700"
                          title="Удалить"
                          onClick={() => handleDelete(c)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <CharacterModal
        open={modalOpen}
        character={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
