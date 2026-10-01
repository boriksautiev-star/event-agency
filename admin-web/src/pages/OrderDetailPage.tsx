import { useNavigate, useParams } from "react-router-dom";
import type { OrderStatus } from "../api/types";
import {
  ASSIGNMENT_STATUS_LABELS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@event-agency/shared";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useOrder, useUpdateOrderStatus, useOrderFinance } from "../hooks/useOrders";
import { ORDER_STATUS_BADGE } from "../lib/orderStatus";
import {
  ASSIGNMENT_BADGE,
  PAYMENT_METHOD_LABELS,
  TRANSPORT_POLICY_LABELS,
} from "../lib/labels";
import { formatDate, formatDateTime, formatMoney, formatTimeRange } from "../lib/format";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error } = useOrder(id);
  const statusMutation = useUpdateOrderStatus(id);
  const finance = useOrderFinance(id);

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500">Загрузка…</div>;
  }
  if (isError || !order) {
    return (
      <div className="p-10 text-center text-red-600">
        Ошибка: {(error as any)?.response?.data?.error ?? "Заказ не найден"}
      </div>
    );
  }

  const activeAnimators = (order.animators ?? []).filter(
    (a: { status: string }) => a.status !== "removed" && a.status !== "declined",
  );
  const transportTotal = activeAnimators.reduce(
    (s: number, a: { transportCost: string | number }) => s + Number(a.transportCost || 0),
    0,
  );
  const debt = Number(order.clientPrice) - Number(order.prepaymentAmount || 0);

  const transitions = ORDER_STATUS_FLOW[order.status];

  const STATUS_BUTTON: Record<OrderStatus, { variant: "default" | "destructive"; label: string }> = {
    new: { variant: "default", label: "Новый" },
    confirmed: { variant: "default", label: "Подтвердить" },
    in_progress: { variant: "default", label: "В работу" },
    completed: { variant: "default", label: "Выполнить" },
    cancelled: { variant: "destructive", label: "Отменить" },
  };

  const handleStatusChange = (status: OrderStatus) => {
    if (status === "cancelled") {
      const ok = window.confirm(
        "Отменить заказ? Откатить будет можно только сменой статуса вручную.",
      );
      if (!ok) return;
    }
    statusMutation.mutate(
      { status },
      {
        onError: (e: any) => {
          alert(e?.response?.data?.error ?? "Не удалось изменить статус");
        },
      },
    );
  };

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Хлебные крошки + действия */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="hover:text-primary transition"
          >
            Заказы
          </button>
          <span>/</span>
          <span className="text-gray-800 font-semibold">{order.title}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
          ← К списку
        </Button>
      </div>

      {/* Действия со статусом */}
      {transitions.length > 0 ? (
        <Card>
          <CardContent className="py-3 px-5 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 uppercase tracking-wide mr-1">
              Перевести в:
            </span>
            {transitions.map((t) => {
              const cfg = STATUS_BUTTON[t];
              return (
                <Button
                  key={t}
                  variant={cfg.variant}
                  size="sm"
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusChange(t)}
                >
                  {cfg.label}
                </Button>
              );
            })}
            {statusMutation.isPending ? (
              <span className="text-xs text-gray-500 ml-2">Обновление…</span>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Основное */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-xl">{order.title}</CardTitle>
              {order.description ? (
                <p className="text-sm text-gray-500 mt-1">{order.description}</p>
              ) : null}
            </div>
            <Badge variant={ORDER_STATUS_BADGE[order.status]}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Клиент" value={order.client?.name ?? "—"} />
          <Field label="Телефон" value={order.client?.phone ?? "—"} />
          <Field
            label="Дата события"
            value={formatDate(order.eventDate)}
          />
          <Field label="Время" value={formatTimeRange(order.startTime, order.endTime)} />
          <Field label="Адрес" value={order.address ?? "—"} />
          <Field
            label="Принят аниматором"
            value={order.acceptedAt ? formatDateTime(order.acceptedAt) : "—"}
          />
        </CardContent>
      </Card>

      {/* Финансы */}
      <Card>
        <CardHeader>
          <CardTitle>Финансы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Программа (сумма)" value={formatMoney(order.subtotal)} />
          {Number(order.discountAmount) > 0 ? (
            <Row
              label={`Скидка ${Number(order.discountPercent)}%`}
              value={`−${formatMoney(order.discountAmount)}`}
              valueClass="text-red-600"
            />
          ) : null}
          <Row
            label="Итого для клиента"
            value={formatMoney(order.clientPrice)}
            valueClass="text-gray-900 font-bold"
          />
          <div className="border-t border-gray-100 my-2" />
          <Row
            label={`Предоплата${order.prepaymentPaidAt ? " ✓" : ""}`}
            value={formatMoney(order.prepaymentAmount)}
            valueClass={order.prepaymentPaidAt ? "text-emerald-600" : "text-gray-500"}
          />
          <Row
            label="Остаток"
            value={formatMoney(debt)}
            valueClass={debt > 0 ? "text-amber-600" : "text-emerald-600"}
          />
          {Number(order.finalPaymentAmount) > 0 ? (
            <Row
              label="Финальная оплата"
              value={formatMoney(order.finalPaymentAmount)}
            />
          ) : null}
          {order.finalPaymentReceivedAt ? (
            <Row
              label={`Получено${order.finalPaymentMethod ? " (" + PAYMENT_METHOD_LABELS[order.finalPaymentMethod].toLowerCase() + ")" : ""}`}
              value={formatDateTime(order.finalPaymentReceivedAt)}
              valueClass="text-emerald-600"
            />
          ) : null}
          {order.finalPaymentHandedAt ? (
            <Row
              label="Сдано в кассу / сверено"
              value={formatDateTime(order.finalPaymentHandedAt)}
              valueClass="text-emerald-600"
            />
          ) : null}

          <div className="border-t border-gray-100 my-2" />

          {/* Управление предоплатой */}
          {Number(order.prepaymentAmount) > 0 ? (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {!order.prepaymentPaidAt ? (
                <Button
                  size="sm"
                  disabled={finance.prepayment.isPending}
                  onClick={() =>
                    finance.prepayment.mutate(true, {
                      onError: (e: any) =>
                        alert(e?.response?.data?.error ?? "Не удалось"),
                    })
                  }
                >
                  ✓ Отметить предоплату
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={finance.prepayment.isPending}
                  onClick={() => {
                    if (!window.confirm("Снять отметку предоплаты?")) return;
                    finance.prepayment.mutate(false, {
                      onError: (e: any) =>
                        alert(e?.response?.data?.error ?? "Не удалось"),
                    });
                  }}
                >
                  Снять отметку предоплаты
                </Button>
              )}
            </div>
          ) : null}

          {/* Управление финалом */}
          {Number(order.finalPaymentAmount) > 0 ? (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {!order.finalPaymentReceivedAt ? (
                <>
                  <span className="text-xs text-gray-500 mr-1">Принять финал:</span>
                  <Button
                    size="sm"
                    disabled={finance.finalPayment.isPending}
                    onClick={() =>
                      finance.finalPayment.mutate("cash", {
                        onError: (e: any) =>
                          alert(e?.response?.data?.error ?? "Не удалось"),
                      })
                    }
                  >
                    Наличными
                  </Button>
                  <Button
                    size="sm"
                    disabled={finance.finalPayment.isPending}
                    onClick={() =>
                      finance.finalPayment.mutate("transfer", {
                        onError: (e: any) =>
                          alert(e?.response?.data?.error ?? "Не удалось"),
                      })
                    }
                  >
                    Переводом
                  </Button>
                </>
              ) : (
                <>
                  {!order.finalPaymentHandedAt ? (
                    <>
                      <Button
                        size="sm"
                        disabled={finance.handover.isPending}
                        onClick={() =>
                          finance.handover.mutate(undefined, {
                            onError: (e: any) =>
                              alert(e?.response?.data?.error ?? "Не удалось"),
                          })
                        }
                      >
                        {order.finalPaymentMethod === "cash"
                          ? "Сдал в кассу"
                          : "Сверить по выписке"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={finance.unmark.isPending}
                        onClick={() => {
                          if (!window.confirm("Отменить отметку получения финала?")) return;
                          finance.unmark.mutate(undefined, {
                            onError: (e: any) =>
                              alert(e?.response?.data?.error ?? "Не удалось"),
                          });
                        }}
                      >
                        Отменить отметку
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-emerald-600 font-medium">
                      ✓ Финал полностью закрыт
                    </span>
                  )}
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
      {/* Персонажи и программа */}
      <Card>
        <CardHeader>
          <CardTitle>Персонажи и программа</CardTitle>
        </CardHeader>
        <CardContent>
          {(order.slots ?? []).length === 0 ? (
            <div className="text-sm text-gray-500">Персонажи не добавлены</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Персонаж</TableHead>
                  <TableHead className="w-[80px] whitespace-nowrap">Длит.</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Цена</TableHead>
                  <TableHead>Аниматор</TableHead>
                  <TableHead className="w-[100px] text-right whitespace-nowrap">Выплата</TableHead>
                  <TableHead className="w-[110px]">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.slots ?? []).map((s: any) => {
                  const assignment = (order.animators ?? []).find(
                    (a: any) => a.slotId === s.id && a.status !== "removed" && a.status !== "declined",
                  );
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                        {s.character?.name ?? s.characterNameSnapshot ?? "—"}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {s.rateDurationMinutes} мин
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatMoney(s.clientPrice)}</TableCell>
                      <TableCell>
                        {assignment ? (
                          <div>
                            <div className="font-medium text-gray-900 whitespace-nowrap">
                              {assignment.animator.firstName} {assignment.animator.lastName}
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">{assignment.animator.phone}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Не назначен</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {assignment ? formatMoney(assignment.payout) : "—"}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <Badge variant={ASSIGNMENT_BADGE[assignment.status] ?? "default"}>
                            {ASSIGNMENT_STATUS_LABELS[assignment.status as keyof typeof ASSIGNMENT_STATUS_LABELS] ?? assignment.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Транспорт */}
      <Card>
        <CardHeader>
          <CardTitle>Транспорт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row
            label="Политика"
            value={TRANSPORT_POLICY_LABELS[order.transportPolicy] ?? order.transportPolicy}
          />
          {activeAnimators.length > 0 ? (
            <>
              <div className="border-t border-gray-100 my-2" />
              {activeAnimators.map((a: any) => (
                <Row
                  key={a.id}
                  label={`${a.animator.firstName} ${a.animator.lastName}`}
                  value={Number(a.transportCost) > 0 ? formatMoney(a.transportCost) : "—"}
                />
              ))}
              {transportTotal > 0 ? (
                <Row
                  label="Итого на транспорте (агентство)"
                  value={formatMoney(transportTotal)}
                  valueClass="text-gray-900 font-bold"
                />
              ) : null}
            </>
          ) : (
            <div className="text-sm text-gray-500">Нет назначенных аниматоров</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500 tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium ${valueClass ?? "text-gray-900"}`}>{value}</span>
    </div>
  );
}
