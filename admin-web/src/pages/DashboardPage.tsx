import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { useOrders } from "../hooks/useOrders";
import { useAvailability } from "../hooks/useAnimators";
import { useFinanceSummary } from "../hooks/useFinance";
import { fmtMoney } from "../lib/financeHelpers";
import { formatDate, formatTimeRange } from "../lib/format";
import { ORDER_STATUS_BADGE } from "../lib/orderStatus";
import { ORDER_STATUS_LABELS } from "@event-agency/shared";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstDayOfMonth(offsetMonths = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function lastDayOfMonth(offsetMonths = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths + 1, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardPage() {
  const today = useMemo(() => todayIso(), []);
  const weekAhead = useMemo(() => addDays(today, 7), [today]);
  const monthFrom = useMemo(() => firstDayOfMonth(), []);
  const monthTo = useMemo(() => lastDayOfMonth(), []);
  const prevMonthFrom = useMemo(() => firstDayOfMonth(-1), []);
  const prevMonthTo = useMemo(() => lastDayOfMonth(-1), []);

  const todayOrders = useOrders({ dateFrom: today, dateTo: today, limit: 200 });
  const weekOrders = useOrders({ dateFrom: today, dateTo: weekAhead, limit: 200 });
  const monthOrders = useOrders({ dateFrom: monthFrom, dateTo: monthTo, limit: 200 });

  const availability = useAvailability(today);

  const noAnimators = useOrders({
    hasAnimators: "false",
    dateFrom: today,
    dateTo: weekAhead,
    limit: 50,
  });

  const noPrepayment = useOrders({
    prepaymentPaid: "false",
    dateFrom: today,
    dateTo: weekAhead,
    limit: 50,
  });

  const upcoming = useOrders({
    dateFrom: today,
    dateTo: addDays(today, 30),
    limit: 5,
  });

  const monthSummary = useFinanceSummary({ from: monthFrom, to: monthTo });
  const prevMonthSummary = useFinanceSummary({ from: prevMonthFrom, to: prevMonthTo });

  // Свободные аниматоры сегодня
  const freeAnimators = useMemo(() => {
    const items = availability.data ?? [];
    return items.filter((a) => {
      const busy = (a.orders ?? []).some((o) => o.orderStatus !== "cancelled");
      return !busy;
    });
  }, [availability.data]);

  const totalAnimators = availability.data?.length ?? 0;

  // Сравнение кассовой прибыли с прошлым месяцем
  const monthCash = monthSummary.data?.cashProfit ?? 0;
  const prevCash = prevMonthSummary.data?.cashProfit ?? 0;
  const cashDelta = prevCash > 0 ? ((monthCash - prevCash) / prevCash) * 100 : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Сводка</h1>

      {/* Верхний ряд — метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Заказов сегодня"
          value={String(todayOrders.data?.total ?? "—")}
          hint={`${weekOrders.data?.total ?? "—"} за 7 дней · ${monthOrders.data?.total ?? "—"} за месяц`}
        />
        <MetricCard
          label="Свободные аниматоры сегодня"
          value={availability.isLoading ? "—" : `${freeAnimators.length} / ${totalAnimators}`}
          hint="Можно назначить"
          color="emerald"
        />
        <MetricCard
          label="Без аниматора"
          value={String(noAnimators.data?.total ?? "—")}
          hint="На 7 дней вперёд"
          color={(noAnimators.data?.total ?? 0) > 0 ? "red" : "gray"}
        />
        <MetricCard
          label="Без предоплаты"
          value={String(noPrepayment.data?.total ?? "—")}
          hint="На 7 дней вперёд"
          color={(noPrepayment.data?.total ?? 0) > 0 ? "amber" : "gray"}
        />
      </div>

      {/* Средний ряд */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Касса за месяц */}
        <Card>
          <CardHeader>
            <CardTitle>Касса за текущий месяц</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-extrabold text-emerald-600">
              {monthSummary.isLoading ? "…" : fmtMoney(monthCash)}
            </div>
            {cashDelta !== null ? (
              <div
                className={cn(
                  "text-xs font-semibold",
                  cashDelta >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                {cashDelta >= 0 ? "▲" : "▼"} {Math.abs(cashDelta).toFixed(1)}% к прошлому месяцу
              </div>
            ) : (
              <div className="text-xs text-gray-400">Нет данных для сравнения</div>
            )}
            {monthSummary.data ? (
              <div className="pt-2 text-xs text-gray-500 space-y-1">
                <div>Пришло: {fmtMoney(monthSummary.data.income.total)}</div>
                <div>Выплачено аниматорам: {fmtMoney(monthSummary.data.paidPayouts)}</div>
                <div>Прочие расходы: {fmtMoney(monthSummary.data.otherExpenses)}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Ближайшие заказы */}
        <Card>
          <CardHeader>
            <CardTitle>Ближайшие заказы</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.isLoading ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
            ) : (upcoming.data?.items ?? []).length === 0 ? (
              <div className="text-sm text-gray-500">Нет ближайших заказов</div>
            ) : (
              <div className="space-y-2">
                {(upcoming.data?.items ?? []).map((o) => (
                  <Link
                    key={o.id}
                    to={`/orders/${o.id}`}
                    className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {o.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(o.eventDate)} · {formatTimeRange(o.startTime, o.endTime)}
                      </div>
                    </div>
                    <Badge variant={ORDER_STATUS_BADGE[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Нижний ряд — списки требующих внимания */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Требуют назначения аниматора</CardTitle>
          </CardHeader>
          <CardContent>
            {noAnimators.isLoading ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
            ) : (noAnimators.data?.items ?? []).length === 0 ? (
              <div className="text-sm text-emerald-600">Все заказы укомплектованы ✓</div>
            ) : (
              <div className="space-y-2">
                {(noAnimators.data?.items ?? []).slice(0, 5).map((o) => (
                  <Link
                    key={o.id}
                    to={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {o.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(o.eventDate)}
                      </div>
                    </div>
                    <Badge variant="alert">Без аниматора</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ожидают предоплату</CardTitle>
          </CardHeader>
          <CardContent>
            {noPrepayment.isLoading ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
            ) : (noPrepayment.data?.items ?? []).length === 0 ? (
              <div className="text-sm text-emerald-600">Все предоплаты получены ✓</div>
            ) : (
              <div className="space-y-2">
                {(noPrepayment.data?.items ?? []).slice(0, 5).map((o) => (
                  <Link
                    key={o.id}
                    to={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {o.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(o.eventDate)} · {fmtMoney(Number(o.prepaymentAmount))}
                      </div>
                    </div>
                    <Badge variant="warning">Ждёт оплату</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  color = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  color?: "primary" | "emerald" | "amber" | "red" | "gray";
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-600"
      : color === "amber"
        ? "text-amber-600"
        : color === "red"
          ? "text-red-600"
          : color === "gray"
            ? "text-gray-700"
            : "text-primary";
  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={cn("text-2xl font-bold mt-1", colorClass)}>{value}</div>
        {hint ? <div className="text-xs text-gray-400 mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
