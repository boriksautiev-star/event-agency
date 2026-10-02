import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Pencil, KeyRound, Ban } from "lucide-react";
import type { UserLite, UserStatus } from "../../api/users";
import {
  useUsers,
  useDeleteUser,
} from "../../hooks/useUsers";
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
import { AnimatorModal } from "../../components/AnimatorModal";
import { PasswordResetModal } from "../../components/PasswordResetModal";

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Активен",
  blocked: "Заблокирован",
  invited: "Приглашён",
};

const STATUS_VARIANT: Record<UserStatus, "success" | "danger" | "warning"> = {
  active: "success",
  blocked: "danger",
  invited: "warning",
};

export default function AnimatorsListPage() {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");

  const search = useDebounce(searchInput, 400);

  const params = useMemo(
    () => ({
      role: "animator" as const,
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      limit: 200,
    }),
    [statusFilter, search],
  );

  const { data, isLoading, isError, error } = useUsers(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const deleteMut = useDeleteUser();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserLite | null>(null);

  const [pwReset, setPwReset] = useState<{ id: string; name: string } | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (u: UserLite) => {
    setEditing(u);
    setModalOpen(true);
  };

  const handleBlock = (u: UserLite) => {
    if (u.status === "blocked") {
      alert("Уже заблокирован. Разблокировка — через редактирование.");
      return;
    }
    if (!window.confirm(`Заблокировать «${u.lastName} ${u.firstName}»?`)) return;
    deleteMut.mutate(u.id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось заблокировать"),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-500">
              Всего: <span className="font-semibold text-gray-800">{total}</span>
            </div>
            <Button onClick={openCreate}>+ Добавить аниматора</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Поиск по имени, телефону, email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="md:col-span-2"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | "")}
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="invited">Приглашённые</option>
              <option value="blocked">Заблокированные</option>
            </Select>
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
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Нет аниматоров</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Фамилия Имя</TableHead>
                <TableHead className="w-[180px]">Телефон</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[130px]">Статус</TableHead>
                <TableHead className="w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold text-gray-900">
                    {u.lastName} {u.firstName}
                  </TableCell>
                  <TableCell className="text-gray-700 whitespace-nowrap">
                    {u.phone}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[u.status]}>
                      {STATUS_LABELS[u.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Link to={`/animators/rates?animatorId=${u.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2"
                          title="Ставки"
                        >
                          <Coins size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        title="Изменить"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        title="Сбросить пароль"
                        onClick={() =>
                          setPwReset({
                            id: u.id,
                            name: `${u.lastName} ${u.firstName}`,
                          })
                        }
                      >
                        <KeyRound size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2 text-red-600 hover:text-red-700"
                        title="Заблокировать"
                        onClick={() => handleBlock(u)}
                        disabled={deleteMut.isPending}
                      >
                        <Ban size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AnimatorModal
        open={modalOpen}
        animator={editing}
        onClose={() => setModalOpen(false)}
      />

      <PasswordResetModal
        open={!!pwReset}
        userId={pwReset?.id ?? ""}
        userName={pwReset?.name ?? ""}
        onClose={() => setPwReset(null)}
      />
    </div>
  );
}
