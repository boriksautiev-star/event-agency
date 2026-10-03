import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useAdmin,
  useAccruals,
  usePayments,
  useCancelAccrual,
  useRemovePayment,
} from "../../hooks/useAdminPayroll";
import type { AccrualItem, PaymentItem } from "../../api/adminPayroll";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { AdminCompensationModal } from "../../components/AdminCompensationModal";
import { AdminPaymentModal } from "../../components/AdminPaymentModal";
import { AdminFixedAccrualModal } from "../../components/AdminFixedAccrualModal";
import { fmtMoney } from "../../lib/financeHelpers";
import { formatDate } from "../../lib/format";

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useAdmin(id);
  const { data: accrualsData } = useAccruals(id);
  const { data: paymentsData } = usePayments(id);

  const cancelAccrualMut = useCancelAccrual(id ?? "");
  const removePaymentMut = useRemovePayment(id ?? "");

  const [compModal, setCompModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [fixedModal, setFixedModal] = useState(false);

  const accruals = accrualsData?.items ?? [];
  const payments = paymentsData?.items ?? [];

  const currentType = data?.current?.type ?? null;

  const history = useMemo(
    () => (data?.compensations ?? []).slice(0, 6),
    [data?.compensations],
  );

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500">Загрузка…</div>;
  }
  if (isError || !data) {
    return (
      <div className="p-10 text-center text-red-600">
        Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
      </div>
    );
  }

  const { admin, accruedTotal, paidTotal, balance } = data;

  const handleCancelAccrual = (a: AccrualItem) => {
    if (!window.confirm("Отменить начисление?")) return;
    cancelAccrualMut.mutate(a.id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось отменить"),
    });
  };

  const handleRemovePayment = (p: PaymentItem) => {
    if (!window.confirm("Удалить выплату и связанный расход?")) return;
    removePaymentMut.mutate(p.id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось удалить"),
    });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/staff")}>
          <ArrowLeft size={16} />
          <span className="ml-1">Назад</span>
        </Button>
      </div>

      <Card>
        <CardContent className="py-5 px-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xl font-bold text-gray-900">
                {admin.lastName} {admin.firstName}
              </div>
              <div className="text-sm text-gray-500 mt-1">{admin.phone}</div>
              {admin.email ? (
                <div className="text-sm text-gray-500">{admin.email}</div>
              ) : null}
              <div className="mt-2 text-sm">
                <span className="text-gray-500">Оплата: </span>
                <span className="font-semibold text-gray-900">
                  {data.current
                    ? data.current.type === "percent"
                      ? `${data.current.percentValue ?? 0}% от заказов`
                      : `${fmtMoney(data.current.fixedAmount ?? 0)} / мес`
                    : "не задана"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setCompModal(true)}>
                <Pencil size={14} />
                <span className="ml-1">Изменить ставку</span>
              </Button>
              {currentType === "fixed" ? (
                <Button variant="outline" onClick={() => setFixedModal(true)}>
                  <Plus size={14} />
                  <span className="ml-1">Начислить фикс</span>
                </Button>
              ) : null}
              <Button onClick={() => setPayModal(true)}>
                <Coins size={14} />
                <span className="ml-1">Выплатить</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 px-5">
            <div className="text-xs text-gray-500">Начислено всего</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {fmtMoney(accruedTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5">
            <div className="text-xs text-gray-500">Выплачено всего</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {fmtMoney(paidTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5">
            <div className="text-xs text-gray-500">К выплате</div>
            <div
              className={[
                "text-2xl font-bold mt-1",
                balance > 0
                  ? "text-green-700"
                  : balance < 0
                    ? "text-red-600"
                    : "text-gray-500",
              ].join(" ")}
            >
              {fmtMoney(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {history.length > 0 ? (
        <Card>
          <CardContent className="py-4 px-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              История ставок
            </div>
            <div className="space-y-1">
              {history.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="text-gray-700">
                    {c.type === "percent"
                      ? `${c.percentValue ?? 0}% от заказов`
                      : `${fmtMoney(c.fixedAmount ?? 0)} / мес`}
                  </div>
                  <div className="text-xs text-gray-400">
                    с {formatDate(c.effectiveFrom)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="py-4 px-5">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Начисления
          </div>
          {accruals.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-sm">
              Начислений пока нет
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Дата</TableHead>
                  <TableHead>Заказ / период</TableHead>
                  <TableHead className="w-[140px]">База</TableHead>
                  <TableHead className="w-[120px] text-right">Сумма</TableHead>
                  <TableHead className="w-[120px]">Статус</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accruals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-gray-700 text-sm">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.order ? (
                        <Link
                          to={`/orders/${a.order.id}`}
                          className="text-gray-800 hover:text-primary transition"
                        >
                          {a.order.title}
                        </Link>
                      ) : a.periodFrom && a.periodTo ? (
                        <span className="text-gray-500">
                          Фикс {formatDate(a.periodFrom)} — {formatDate(a.periodTo)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                      {a.comment ? (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {a.comment}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {a.type === "percent"
                        ? `${a.percentValue ?? 0}% от ${fmtMoney(a.baseAmount)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gray-900 whitespace-nowrap">
                      +{fmtMoney(a.amount)}
                    </TableCell>
                    <TableCell>
                      {a.status === "active" ? (
                        <Badge variant="success">Активно</Badge>
                      ) : (
                        <Badge variant="default">Отменено</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2 text-red-600 hover:text-red-700"
                          title="Отменить"
                          onClick={() => handleCancelAccrual(a)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 px-5">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Выплаты
          </div>
          {payments.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-sm">
              Выплат пока нет
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Дата</TableHead>
                  <TableHead className="w-[130px]">Метод</TableHead>
                  <TableHead>Комментарий</TableHead>
                  <TableHead className="w-[130px] text-right">Сумма</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-gray-700 text-sm">
                      {formatDate(p.paidAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {p.method === "cash" ? "Наличные" : "Перевод"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {p.comment ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600 whitespace-nowrap">
                      −{fmtMoney(p.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2 text-red-600 hover:text-red-700"
                        title="Удалить"
                        onClick={() => handleRemovePayment(p)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {id ? (
        <>
          <AdminCompensationModal
            open={compModal}
            adminId={id}
            current={data.current}
            onClose={() => setCompModal(false)}
          />
          <AdminPaymentModal
            open={payModal}
            adminId={id}
            balance={balance}
            onClose={() => setPayModal(false)}
          />
          <AdminFixedAccrualModal
            open={fixedModal}
            adminId={id}
            defaultAmount={data.current?.fixedAmount ?? null}
            onClose={() => setFixedModal(false)}
          />
        </>
      ) : null}
    </div>
  );
}
