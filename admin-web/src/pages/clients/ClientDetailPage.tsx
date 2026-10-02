import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ORDER_STATUS_LABELS } from "@event-agency/shared";
import {
  useClient,
  useDeleteClient,
} from "../../hooks/useClients";
import { useOrders } from "../../hooks/useOrders";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { ClientModal } from "../../components/ClientModal";
import { ORDER_STATUS_BADGE } from "../../lib/orderStatus";
import { formatDate, formatMoney, formatTimeRange } from "../../lib/format";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client, isLoading, isError, error } = useClient(id);

  const { data: ordersData } = useOrders({
    search: undefined,
    limit: 200,
  });

  // clientId — параметр не проброшен в useOrders, поэтому фильтруем на клиенте
  // (у клиента обычно немного заказов, отдельный endpoint не обязателен)
  const clientOrders = (ordersData?.items ?? []).filter(
    (o) => o.clientId === id,
  );

  const deleteMut = useDeleteClient();
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = () => {
    if (!client) return;
    if (!window.confirm(`Удалить клиента «${client.name}»?`)) return;
    deleteMut.mutate(client.id, {
      onSuccess: () => navigate("/clients"),
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось удалить клиента"),
    });
  };

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500">Загрузка…</div>;
  }
  if (isError || !client) {
    return (
      <div className="p-10 text-center text-red-600">
        Ошибка: {(error as any)?.response?.data?.error ?? "Клиент не найден"}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="hover:text-primary transition"
          >
            Клиенты
          </button>
          <span>/</span>
          <span className="text-gray-800 font-semibold">{client.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/clients")}>
            ← К списку
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            ✎ Редактировать
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMut.isPending}
          >
            Удалить
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{client.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Телефон" value={client.phone} />
          <Field label="Email" value={client.email ?? "—"} />
          <Field label="Адрес" value={client.address ?? "—"} />
          <Field
            label="Клиент с"
            value={formatDate(client.createdAt)}
          />
          {client.notes ? (
            <div className="md:col-span-2">
              <div className="text-xs uppercase text-gray-500 tracking-wide mb-0.5">
                Заметки
              </div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {client.notes}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Заказы ({clientOrders.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {clientOrders.length === 0 ? (
            <div className="text-sm text-gray-500">Заказов пока нет</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px] whitespace-nowrap">Дата</TableHead>
                  <TableHead className="w-[110px] whitespace-nowrap">Время</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead className="w-[130px]">Статус</TableHead>
                  <TableHead className="w-[110px] text-right whitespace-nowrap">Цена</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDate(o.eventDate)}
                    </TableCell>
                    <TableCell className="text-gray-500 whitespace-nowrap">
                      {formatTimeRange(o.startTime, o.endTime)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-semibold text-gray-900 hover:text-primary transition"
                      >
                        {o.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_BADGE[o.status]}>
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {formatMoney(o.clientPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientModal
        open={editOpen}
        client={client}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500 tracking-wide mb-0.5">
        {label}
      </div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}
