import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { useMeSummary } from "../../hooks/useAdminPayroll";
import {
  getPreset,
  todayIso,
  fmtMoney,
  type Preset,
} from "../../lib/financeHelpers";
import { formatDate } from "../../lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "this_month", label: "Месяц" },
  { key: "last_month", label: "Прошлый" },
  { key: "this_year", label: "Год" },
  { key: "custom", label: "Свой" },
];

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  in_progress: "В работе",
  completed: "Завершён",
  cancelled: "Отменён",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "alert"> = {
  new: "default",
  confirmed: "default",
  in_progress: "warning",
  completed: "success",
  cancelled: "alert",
};

export default function MyOrdersPage() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState(todayIso().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayIso());

  const period = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPreset(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading, isError, error } = useMeSummary(period);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
                  preset === p.key
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <Label>От</Label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <Label>До</Label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-10 text-center text-gray-500">Загрузка…</div>
      ) : isError ? (
        <div className="p-10 text-center text-red-600">
          Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 px-5">
                <div className="text-xs text-gray-500">Начислено за период</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {fmtMoney(data.accruedPeriod)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {data.compensation
                    ? data.compensation.type === "percent"
                      ? `${data.compensation.percentValue ?? 0}% от суммы заказов`
                      : `Фикс ${fmtMoney(data.compensation.fixedAmount ?? 0)} / мес`
                    : "Ставка не задана"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5">
                <div className="text-xs text-gray-500">Выплачено за период</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {fmtMoney(data.paidPeriod)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5">
                <div className="text-xs text-gray-500">К выплате (всего)</div>
                <div
                  className={cn(
                    "text-2xl font-bold mt-1",
                    data.balance > 0
                      ? "text-green-700"
                      : data.balance < 0
                        ? "text-red-600"
                        : "text-gray-500",
                  )}
                >
                  {fmtMoney(data.balance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Мои заказы</CardTitle>
            </CardHeader>
            <CardContent>
              {data.orders.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">
                  Заказов в этом периоде нет
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Дата</TableHead>
                      <TableHead>Заказ</TableHead>
                      <TableHead className="w-[130px] text-right">Клиент</TableHead>
                      <TableHead className="w-[130px] text-right">Моя доля</TableHead>
                      <TableHead className="w-[130px]">Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="whitespace-nowrap text-gray-700 text-sm">
                          {formatDate(o.eventDate)}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/orders/${o.id}`}
                            className="text-sm font-medium text-gray-800 hover:text-primary transition"
                          >
                            {o.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-gray-700 text-sm whitespace-nowrap">
                          {fmtMoney(o.clientPrice)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm">
                          {o.adminAmount !== null ? (
                            <span className="font-semibold text-gray-900">
                              {fmtMoney(o.adminAmount)}
                              {o.adminPercent !== null ? (
                                <span className="text-xs text-gray-400 font-normal ml-1">
                                  ({o.adminPercent}%)
                                </span>
                              ) : null}
                            </span>
                          ) : o.willAccrue ? (
                            <span className="text-xs text-gray-400">после сдачи</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
