import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { useMeLedger } from "../../hooks/useAdminPayroll";
import { getPreset, todayIso, fmtMoney, type Preset } from "../../lib/financeHelpers";
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

export default function MyLedgerPage() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState(todayIso().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayIso());

  const period = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPreset(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading, isError, error } = useMeLedger(period);

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
                <div className="text-xs text-gray-500">Начислено всего</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {fmtMoney(data.accruedTotal)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5">
                <div className="text-xs text-gray-500">Выплачено всего</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {fmtMoney(data.paidTotal)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 px-5">
                <div className="text-xs text-gray-500">К выплате</div>
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
              <CardTitle>Журнал (за период)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.items.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">
                  Записей в этом периоде нет
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Дата</TableHead>
                      <TableHead className="w-[120px]">Тип</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead className="w-[130px] text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((row) => (
                      <TableRow key={`${row.kind}-${row.id}`}>
                        <TableCell className="whitespace-nowrap text-gray-700 text-sm">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell>
                          {row.kind === "accrual" ? (
                            <Badge variant={row.status === "cancelled" ? "default" : "success"}>
                              {row.status === "cancelled" ? "Отменено" : "Начислено"}
                            </Badge>
                          ) : (
                            <Badge variant="warning">Выплата</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.kind === "accrual" ? (
                            <>
                              {row.orderId ? (
                                <Link
                                  to={`/orders/${row.orderId}`}
                                  className="text-gray-800 hover:text-primary transition"
                                >
                                  {row.orderTitle ?? "Заказ"}
                                </Link>
                              ) : (
                                <span className="text-gray-500">Фикс за период</span>
                              )}
                              {row.type === "percent" && row.percentValue !== null ? (
                                <span className="text-xs text-gray-400 ml-1">
                                  {row.percentValue}% от {fmtMoney(row.baseAmount ?? 0)}
                                </span>
                              ) : null}
                              {row.comment ? (
                                <div className="text-xs text-gray-400 mt-0.5">{row.comment}</div>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-gray-600">
                              {row.method === "cash" ? "Наличными" : "Переводом"}
                              {row.comment ? ` · ${row.comment}` : ""}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm font-semibold">
                          {row.kind === "payment" ? (
                            <span className="text-red-600">−{fmtMoney(row.amount)}</span>
                          ) : (
                            <span className={cn(
                              row.status === "cancelled"
                                ? "text-gray-400 line-through"
                                : "text-gray-900",
                            )}>
                              +{fmtMoney(row.amount)}
                            </span>
                          )}
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
