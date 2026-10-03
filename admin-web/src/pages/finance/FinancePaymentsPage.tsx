import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { PaymentItem } from "../../api/finance";
import { usePayments } from "../../hooks/useFinance";
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
import { fmtMoney } from "../../lib/financeHelpers";
import { formatDate } from "../../lib/format";

type PaymentType = "prepayment" | "final" | "refund";
type PaymentMethod = "cash" | "transfer";

const TYPE_LABEL: Record<PaymentType, string> = {
  prepayment: "Предоплата",
  final: "Финал",
  refund: "Возврат",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Наличные",
  transfer: "Перевод",
};

export default function FinancePaymentsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<"" | PaymentType>("");
  const [method, setMethod] = useState<"" | PaymentMethod>("");

  const query = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      type: (type || undefined) as PaymentType | undefined,
      method: (method || undefined) as PaymentMethod | undefined,
      limit: 200,
    }),
    [from, to, type, method],
  );

  const { data, isLoading, isError, error } = usePayments(query);
  const items = data?.items ?? [];
  const sum = data?.sum ?? 0;

  const activeFiltersCount =
    (from ? 1 : 0) + (to ? 1 : 0) + (type ? 1 : 0) + (method ? 1 : 0);

  const resetFilters = () => {
    setFrom("");
    setTo("");
    setType("");
    setMethod("");
  };

  const rowAmountClass = (t: PaymentType) =>
    t === "refund"
      ? "text-red-600"
      : t === "final"
        ? "text-green-600"
        : "text-blue-600";

  const rowSign = (t: PaymentType) => (t === "refund" ? "−" : "+");

  const typeBadgeVariant = (t: PaymentType): "default" | "success" | "alert" => {
    if (t === "final") return "success";
    if (t === "refund") return "alert";
    return "default";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as "" | PaymentType)}
            >
              <option value="">Все типы</option>
              <option value="prepayment">Предоплата</option>
              <option value="final">Финал</option>
              <option value="refund">Возврат</option>
            </Select>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as "" | PaymentMethod)}
            >
              <option value="">Все методы</option>
              <option value="cash">Наличные</option>
              <option value="transfer">Перевод</option>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              title="С"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              title="По"
            />
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={activeFiltersCount === 0}
            >
              Сбросить фильтры
            </Button>
          </div>

          {activeFiltersCount > 0 ? (
            <div className="text-xs text-gray-500 pt-1">
              Активных фильтров: {activeFiltersCount}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 px-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-gray-500">
            Записей:{" "}
            <span className="font-semibold text-gray-800">{items.length}</span>
          </div>
          <div className="text-sm text-gray-500">
            Итог:{" "}
            <span
              className={
                sum >= 0
                  ? "font-semibold text-green-600"
                  : "font-semibold text-red-600"
              }
            >
              {sum >= 0 ? "+" : "−"}{fmtMoney(Math.abs(sum))}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Загрузка…</div>
        ) : isError ? (
          <div className="p-10 text-center text-red-600">
            Ошибка:{" "}
            {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Поступлений нет</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px] whitespace-nowrap">Дата</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead className="w-[130px]">Тип</TableHead>
                <TableHead className="w-[120px]">Метод</TableHead>
                <TableHead className="w-[130px] text-right whitespace-nowrap">
                  Сумма
                </TableHead>
                <TableHead>Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p: PaymentItem) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {formatDate(p.paidAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/orders/${p.order.id}`}
                      className="text-sm font-medium text-gray-800 hover:text-primary transition"
                    >
                      {p.order.title}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {formatDate(p.order.eventDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-800">
                      {p.order.client?.name ?? "—"}
                    </div>
                    {p.order.client?.phone ? (
                      <div className="text-xs text-gray-400">
                        {p.order.client.phone}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant(p.type)}>
                      {TYPE_LABEL[p.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {METHOD_LABEL[p.method]}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold whitespace-nowrap ${rowAmountClass(p.type)}`}
                  >
                    {rowSign(p.type)}{fmtMoney(p.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    <span className="line-clamp-2">{p.comment ?? "—"}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
