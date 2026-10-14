import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { useAnimatorsList } from "../../hooks/useAnimatorsList";
import {
  useApproveHandover,
  useHandoverHistory,
  usePendingApproval,
  useRejectHandover,
} from "../../hooks/useHandover";
import type {
  HandoverStatus,
  HandoverStatusGroup,
} from "../../api/handover";
import { formatDate, formatTimeRange } from "../../lib/format";

const STATUS_LABELS: Record<HandoverStatus, string> = {
  pending_receiver: "Ждёт ответа",
  pending_approval: "Ждёт подтверждения",
  approved: "Подтверждена",
  rejected_by_receiver: "Отклонил получатель",
  rejected_by_admin: "Отклонил руководитель",
  cancelled: "Отозвана",
};

const STATUS_VARIANT: Record<
  HandoverStatus,
  "success" | "danger" | "warning" | "default"
> = {
  pending_receiver: "warning",
  pending_approval: "warning",
  approved: "success",
  rejected_by_receiver: "danger",
  rejected_by_admin: "danger",
  cancelled: "default",
};

type Tab = { key: HandoverStatusGroup; label: string };

const TABS: Tab[] = [
  { key: "pending", label: "Ожидают" },
  { key: "all", label: "Все" },
  { key: "approved", label: "Подтверждённые" },
  { key: "rejected", label: "Отклонённые" },
  { key: "cancelled", label: "Отменённые" },
];

export default function HandoverPage() {
  const [tab, setTab] = useState<HandoverStatusGroup>("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [animatorId, setAnimatorId] = useState("");

  const { data: animators = [] } = useAnimatorsList();

  const pending = usePendingApproval();
  const approve = useApproveHandover();
  const reject = useRejectHandover();

  const isPendingTab = tab === "pending";

  const historyQuery = useMemo(
    () => ({
      statusGroup: tab,
      animatorId: animatorId || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      limit: 200,
    }),
    [tab, animatorId, dateFrom, dateTo],
  );

  // Единый источник для всех табов — история с фильтрами
  const history = useHandoverHistory(historyQuery);

  const items = history.data ?? [];
  const loading = history.isLoading;

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const handleApprove = (id: string) => {
    if (!confirm("Подтвердить передачу заказа?")) return;
    approve.mutate(id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось подтвердить"),
    });
  };

  const handleRejectStart = (id: string) => {
    setRejectingId(id);
    setRejectComment("");
  };

  const handleRejectSubmit = (id: string) => {
    reject.mutate(
      { id, rejectComment: rejectComment.trim() || null },
      {
        onSuccess: () => {
          setRejectingId(null);
          setRejectComment("");
        },
        onError: (e: any) =>
          alert(e?.response?.data?.error ?? "Не удалось отклонить"),
      },
    );
  };

  const pendingCount = pending.count;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Заявки на передачу</h1>
        {pendingCount > 0 ? (
          <Badge variant="warning">Ожидают: {pendingCount}</Badge>
        ) : null}
      </div>

      {/* Табы */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px flex-wrap">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  "px-4 py-2 text-sm font-semibold border-b-2 transition",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-800",
                ].join(" ")}
              >
                {t.label}
                {t.key === "pending" && pendingCount > 0 ? (
                  <span className="ml-1.5 text-xs text-amber-600 font-bold">
                    ({pendingCount})
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Панель фильтров */}
      <Card>
        <CardContent className="py-3 px-5 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">Аниматор:</span>
          <Select
            value={animatorId}
            onChange={(e) => setAnimatorId(e.target.value)}
            className="!w-auto min-w-[220px]"
          >
            <option value="">Все аниматоры</option>
            {animators
              .slice()
              .sort((a: any, b: any) => a.lastName.localeCompare(b.lastName))
              .map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.lastName} {a.firstName}
                </option>
              ))}
          </Select>

          <span className="text-xs text-gray-500 ml-3 mr-1">Период:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="!w-auto"
          />
          <span className="text-xs text-gray-400">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="!w-auto"
          />
          {animatorId || dateFrom || dateTo ? (
            <button
              type="button"
              onClick={() => {
                setAnimatorId("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-primary hover:underline ml-2"
            >
              Сбросить
            </button>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-gray-500">Загрузка…</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-emerald-600">
            {isPendingTab ? "Очередь пуста — заявок на подтверждение нет ✓" : "Нет заявок"}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3">Заказ</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Персонаж</th>
                  <th className="px-4 py-3">От кого</th>
                  <th className="px-4 py-3">Кому</th>
                  <th className="px-4 py-3 w-40">Статус</th>
                  <th className="px-4 py-3 w-64">Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((req) => {
                  const char =
                    req.slot?.character?.name ??
                    req.slot?.characterNameSnapshot ??
                    "—";
                  const isRejecting = rejectingId === req.id;
                  const isPendingRow = req.status === "pending_approval";
                  return (
                    <tr key={req.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          to={`/orders/${req.orderId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {req.order.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(req.order.eventDate)}
                        <div className="text-xs text-gray-400">
                          {formatTimeRange(req.order.startTime, req.order.endTime)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{char}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {req.fromAnimator.firstName} {req.fromAnimator.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {req.toAnimator.firstName} {req.toAnimator.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[req.status]}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                        {req.rejectComment ? (
                          <div className="text-xs text-gray-400 mt-1 italic">
                            «{req.rejectComment}»
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {!isPendingRow ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : isRejecting ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full text-xs border border-gray-300 rounded p-2"
                              rows={2}
                              placeholder="Причина отказа (необязательно)"
                              value={rejectComment}
                              onChange={(e) => setRejectComment(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                disabled={reject.isPending}
                                onClick={() => handleRejectSubmit(req.id)}
                              >
                                Отклонить
                              </button>
                              <button
                                className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                                onClick={() => setRejectingId(null)}
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              disabled={approve.isPending}
                              onClick={() => handleApprove(req.id)}
                            >
                              Подтвердить
                            </button>
                            <button
                              className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100"
                              onClick={() => handleRejectStart(req.id)}
                            >
                              Отклонить
                            </button>
                          </div>
                        )}
                        {req.comment && !isPendingRow ? (
                          <div className="text-xs text-gray-400 mt-1 italic">
                            «{req.comment}»
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
