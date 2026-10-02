import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Eye } from "lucide-react";
import type { Client } from "../../api/types";
import {
  useClients,
  useDeleteClient,
} from "../../hooks/useClients";
import { useDebounce } from "../../hooks/useDebounce";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { ClientModal } from "../../components/ClientModal";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);

  const params = useMemo(
    () => ({ search: search.trim() || undefined }),
    [search],
  );

  const { data: clients = [], isLoading, isError, error } = useClients(params);
  const deleteMut = useDeleteClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleDelete = (c: Client) => {
    if (!window.confirm(`Удалить клиента «${c.name}»?`)) return;
    deleteMut.mutate(c.id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось удалить клиента"),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-500">
              Всего: <span className="font-semibold text-gray-800">{clients.length}</span>
            </div>
            <Button onClick={openCreate}>+ Добавить клиента</Button>
          </div>

          <Input
            placeholder="Поиск по имени, телефону, email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Загрузка…</div>
        ) : isError ? (
          <div className="p-10 text-center text-red-600">
            Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Нет клиентов</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead className="w-[180px]">Телефон</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Адрес</TableHead>
                <TableHead className="w-[160px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-gray-900">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-gray-700 whitespace-nowrap">
                    {c.phone}
                  </TableCell>
                  <TableCell className="text-gray-600">{c.email ?? "—"}</TableCell>
                  <TableCell className="text-gray-600">
                    <span className="line-clamp-1">{c.address ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        title="Открыть"
                        onClick={() => navigate(`/clients/${c.id}`)}
                      >
                        <Eye size={14} />
                      </Button>
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
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ClientModal
        open={modalOpen}
        client={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
