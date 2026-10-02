import { useState } from "react";
import type { RateGroup } from "../../api/types";
import {
  useRateGroups,
  useDeleteRateGroup,
} from "../../hooks/useRateGroups";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { RateGroupModal } from "../../components/RateGroupModal";

export default function GroupsPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: groups = [], isLoading, isError, error } = useRateGroups(includeInactive);
  const deleteMut = useDeleteRateGroup();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RateGroup | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (g: RateGroup) => {
    setEditing(g);
    setModalOpen(true);
  };

  const handleDelete = (g: RateGroup) => {
    const chars = (g as any)._count?.characters ?? null;
    const warning =
      chars && chars > 0
        ? `В группе ${chars} персонаж(ей). Удалить можно только если их нет. Продолжить?`
        : `Удалить группу «${g.name}»?`;
    if (!window.confirm(warning)) return;
    deleteMut.mutate(g.id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось удалить группу"),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Всего: <span className="font-semibold text-gray-800">{groups.length}</span>
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Показывать неактивные
            </label>
          </div>
          <Button onClick={openCreate}>+ Добавить группу</Button>
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Загрузка…</div>
        ) : isError ? (
          <div className="p-10 text-center text-red-600">
            Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
          </div>
        ) : groups.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Групп пока нет</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">Порядок</TableHead>
                <TableHead>Название</TableHead>
                <TableHead className="w-[110px]">Статус</TableHead>
                <TableHead className="w-[140px] text-center">Персонажей</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => {
                const chars = (g as any)._count?.characters;
                return (
                  <TableRow key={g.id}>
                    <TableCell className="text-center text-gray-500">{g.sortOrder}</TableCell>
                    <TableCell className="font-semibold text-gray-900">{g.name}</TableCell>
                    <TableCell>
                      {g.isActive ? (
                        <Badge variant="success">Активна</Badge>
                      ) : (
                        <Badge variant="default">Выключена</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {chars !== undefined ? chars : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2"
                          title="Изменить"
                          onClick={() => openEdit(g)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2 text-red-600 hover:text-red-700"
                          title="Удалить"
                          onClick={() => handleDelete(g)}
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

      <RateGroupModal
        open={modalOpen}
        group={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
