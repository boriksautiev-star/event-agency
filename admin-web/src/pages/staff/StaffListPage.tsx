import { Link } from "react-router-dom";
import { useAdmins } from "../../hooks/useAdminPayroll";
import type { AdminListItem } from "../../api/adminPayroll";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { fmtMoney } from "../../lib/financeHelpers";

function compensationLabel(a: AdminListItem): string {
  if (!a.compensation) return "—";
  if (a.compensation.type === "percent") {
    return `${a.compensation.percentValue ?? 0}%`;
  }
  return `${fmtMoney(a.compensation.fixedAmount ?? 0)} / мес`;
}

export default function StaffListPage() {
  const { data, isLoading, isError, error } = useAdmins();
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Сотрудники</h1>
      </div>

      <Card>
        <CardContent className="py-3 px-5 text-sm text-gray-500">
          Здесь можно настроить оплату администраторам (процент от заказов
          или фиксированную сумму), начислить зарплату и сделать выплаты.
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
          <div className="p-10 text-center text-gray-500">Администраторов нет</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Фамилия Имя</TableHead>
                <TableHead className="w-[160px]">Телефон</TableHead>
                <TableHead className="w-[160px]">Оплата</TableHead>
                <TableHead className="w-[130px] text-right">Начислено</TableHead>
                <TableHead className="w-[130px] text-right">Выплачено</TableHead>
                <TableHead className="w-[130px] text-right">К выплате</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold text-gray-900">
                    <div>{a.lastName} {a.firstName}</div>
                    {a.status !== "active" ? (
                      <Badge variant="default" className="mt-1">
                        {a.status === "blocked" ? "Заблокирован" : "Приглашён"}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-gray-700 whitespace-nowrap">
                    {a.phone}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {compensationLabel(a)}
                  </TableCell>
                  <TableCell className="text-right text-gray-700 whitespace-nowrap">
                    {fmtMoney(a.accruedTotal)}
                  </TableCell>
                  <TableCell className="text-right text-gray-500 whitespace-nowrap">
                    {fmtMoney(a.paidTotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    <span
                      className={
                        a.balance > 0
                          ? "text-green-700"
                          : a.balance < 0
                            ? "text-red-600"
                            : "text-gray-500"
                      }
                    >
                      {fmtMoney(a.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Link to={`/staff/${a.id}`}>
                        <Button variant="ghost" size="sm" className="!px-2" title="Открыть">
                          Открыть
                        </Button>
                      </Link>
                    </div>
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
