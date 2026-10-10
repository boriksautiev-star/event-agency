import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  useApproveHandover,
  usePendingApproval,
  useRejectHandover,
} from "../../hooks/useHandover";
import { formatDate, formatTimeRange } from "../../lib/format";

export default function HandoverPage() {
  const pending = usePendingApproval();
  const approve = useApproveHandover();
  const reject = useRejectHandover();

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Заявки на передачу</h1>
        {pending.count > 0 ? (
          <Badge variant="warning">Ожидают: {pending.count}</Badge>
        ) : null}
      </div>

      {pending.isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-gray-500">Загрузка…</CardContent>
        </Card>
      ) : pending.items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-emerald-600">
            Очередь пуста — заявок на подтверждение нет ✓
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
                  <th className="px-4 py-3 w-64">Действия</th>
                </tr>
              </thead>
              <tbody>
                {pending.items.map((req) => {
                  const char =
                    req.slot?.character?.name ??
                    req.slot?.characterNameSnapshot ??
                    "—";
                  const isRejecting = rejectingId === req.id;
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
                        {req.fromAnimator.phone ? (
                          <div className="text-xs text-gray-400">
                            {req.fromAnimator.phone}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {req.toAnimator.firstName} {req.toAnimator.lastName}
                        </div>
                        {req.toAnimator.phone ? (
                          <div className="text-xs text-gray-400">
                            {req.toAnimator.phone}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {isRejecting ? (
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
                        {req.comment ? (
                          <div className="text-xs text-gray-400 mt-2 italic">
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
