import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { cn } from "../../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { usePayouts, useMarkPayoutPaid, useUnmarkPayoutPaid } from "../../hooks/useFinance";
import { useAnimatorsList } from "../../hooks/useAnimatorsList";
import { fmtMoney } from "../../lib/financeHelpers";
import { formatDate, formatTimeRange } from "../../lib/format";

type PaidFilter = "false" | "true" | "all";

export default function FinancePayoutsPage() {
  const [paid, setPaid] = useState<PaidFilter>("false");
  const [animatorId, setAnimatorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: animators = [] } = useAnimatorsList();

  const query = useMemo(
    () => ({
      paid,
      animatorId: animatorId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [paid, animatorId, from, to],
  );

  const { data, isLoading, isError, error } = usePayouts(query);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const markMut = useMarkPayoutPaid();
  const unmarkMut = useUnmarkPayoutPaid();

  const animatorsSorted = useMemo(
    () => [...animators].sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [animators],
  );

  const handleMark = (id: string, name: string, amount: number, method: "cash" | "transfer") => {
    const label = method === "cash" ? "наличными" : "переводом";
    if (!window.confirm(`Отметить выплату ${name}\n${fmtMoney(amount)} — ${label}?`)) return;
    markMut.mutate(
      { id, method },
      {
        onError: (e: any) =>
          alert(e?.response?.data?.error ?? "Не удалось отметить"),
      },
    );
  };

  const handleUnmark = (id: string, name: string) => {
    if (!window.confirm(`Снять отметку «выплачено» для ${name}?`)) return;
    unmarkMut.mutate(id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось снять отметку"),
    });
  };

  const activeFiltersCount =
    (paid !== "false" ? 1 : 0) +
    (animatorId ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  const resetFilters = () => {
    setPaid("false");
    setAnimatorId("");
    setFrom("");
    setTo("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "false", label: "К выплате" },
              { key: "true", label: "Выплачено" },
              { key: "all", label: "Все" },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setPaid(t.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
                  paid === t.key
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={animatorId} onChange={(e) => setAnimatorId(e.target.value)}>
              <option value="">Все аниматоры</option>
              {animatorsSorted.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.lastName} {a.firstName}
                </option>
              ))}
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="С" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="По" />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div className="text-xs text-gray-500">
              {activeFiltersCount > 0
                ? `Активных фильтров: ${activeFiltersCount}`
                : "Фильтры не заданы"}
            </div>
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Сбросить фильтры
              </button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 px-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-gray-500">
            Всего записей: <span className="font-semibold text-gray-800">{items.length}</span>
            {total !== items.length ? (
              <span className="ml-2 text-xs text-gray-400">(всего: {total})</span>
            ) : null}
          </div>
          <div className="text-sm text-gray-500">
            Сумма: <span className="font-semibold text-gray-800">{fmtMoney(total)}</span>
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
          <div className="p-10 text-center text-gray-500">Записей нет</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Аниматор</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead className="w-[110px] whitespace-nowrap">Дата</TableHead>
                <TableHead className="w-[130px] text-right whitespace-nowrap">Выплата</TableHead>
                <TableHead className="w-[110px] text-right whitespace-nowrap">Транспорт</TableHead>
                <TableHead className="w-[160px]">Статус</TableHead>
                <TableHead className="w-[220px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const isPaid = !!it.payoutPaidAt;
                const fullName = `${it.animator.lastName} ${it.animator.firstName}`;
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                      {fullName}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/orders/${it.orderId}`}
                        className="text-sm text-gray-800 hover:text-primary transition"
                      >
                        {it.order.title}
                      </Link>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatTimeRange(it.order.startTime, it.order.endTime)}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-700">
                      {formatDate(it.order.eventDate)}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {fmtMoney(it.payout)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-gray-600">
                      {it.transportCost > 0 ? fmtMoney(it.transportCost) : "—"}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <div>
                          <Badge variant="success">Выплачено</Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            {it.payoutMethod === "cash"
                              ? "наличными"
                              : it.payoutMethod === "transfer"
                              ? "переводом"
                              : ""}
                            {it.payoutPaidAt ? (
                              <>
                                {" · "}
                                {new Date(it.payoutPaidAt).toLocaleString("ru-RU", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="warning">К выплате</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnmark(it.id, fullName)}
                            disabled={unmarkMut.isPending}
                          >
                            Отменить
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleMark(it.id, fullName, it.payout, "cash")}
                            disabled={markMut.isPending}
                          >
                            💵 Наличными
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMark(it.id, fullName, it.payout, "transfer")}
                            disabled={markMut.isPending}
                          >
                            💳 Переводом
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
