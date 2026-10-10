import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { useAnimatorReport, useAdmin } from "../../hooks/useAdminPayroll";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  getPreset,
  todayIso,
  fmtMoney,
  type Preset,
} from "../../lib/financeHelpers";
import { formatDate, formatDateTime } from "../../lib/format";
import { ORDER_STATUS_LABELS } from "@event-agency/shared";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "this_month", label: "Месяц" },
  { key: "last_month", label: "Прошлый" },
  { key: "this_year", label: "Год" },
  { key: "custom", label: "Свой" },
];

const RELEASE_REASON_LABELS: Record<string, string> = {
  declined: "Отказ",
  handed_over: "Передал другому",
  removed_rotation: "Снят (ротация)",
  removed_quality: "Снят (качество)",
  order_cancelled: "Заказ отменён",
};

export default function AnimatorReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<Preset>("this_year");
  const [customFrom, setCustomFrom] = useState(todayIso().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayIso());

  const period = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPreset(preset);
  }, [preset, customFrom, customTo]);

  const { data: admin } = useAdmin(id);
  const { data, isLoading, isError, error } = useAnimatorReport(id, {
    from: period.from,
    to: period.to,
    scope: "all",
  });

  const periodLabel = useMemo(() => {
    if (preset === "this_month") return "Текущий месяц";
    if (preset === "last_month") return "Прошлый месяц";
    if (preset === "this_year") return "Текущий год";
    return "Свой период";
  }, [preset]);

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Хлебные крошки + назад */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/animators/list")}>
          <ArrowLeft size={16} />
          <span className="ml-1">К аниматорам</span>
        </Button>
        {admin?.admin ? (
          <div className="text-sm text-gray-500">
            {admin.admin.lastName} {admin.admin.firstName}
          </div>
        ) : null}
      </div>

      {/* Пресеты периода */}
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
          {/* Сводка */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>{periodLabel}</CardTitle>
                <div className="text-sm text-gray-500">
                  {data.period.from} → {data.period.to}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric value={String(data.summary.ordersCount)} label="Заказов отработано" color="primary" />
                <Metric value={String(data.summary.acceptedCount)} label="Принял заказов" color="primary" />
                <Metric value={String(data.summary.declinedCount)} label="Отказался" color="warn" />
                <Metric value={String(data.summary.removedCount)} label="Снят (не в счёт отказа)" color="danger" />
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <Row label="Начислено всего" value={fmtMoney(data.summary.payoutTotal)} />
                <Row
                  label="Выплачено"
                  value={fmtMoney(data.summary.payoutPaid)}
                  valueClass="text-emerald-600"
                />
                {data.summary.payoutPaidCash > 0 ? (
                  <Row
                    label="— наличными"
                    value={fmtMoney(data.summary.payoutPaidCash)}
                    indent
                  />
                ) : null}
                {data.summary.payoutPaidTransfer > 0 ? (
                  <Row
                    label="— переводом"
                    value={fmtMoney(data.summary.payoutPaidTransfer)}
                    indent
                  />
                ) : null}
                <Row
                  label="К выплате"
                  value={fmtMoney(data.summary.payoutRemaining)}
                  valueClass="text-primary font-bold"
                />
                <Row
                  label="Процент принятия"
                  value={`${data.summary.acceptRate}%`}
                />
              </div>

              {data.summary.lostPayout > 0 ? (
                <div className="border-t border-gray-100 pt-3">
                  <Row
                    label="Упущено из-за отказов аниматора"
                    value={fmtMoney(data.summary.lostPayout)}
                    valueClass="text-red-600 font-bold"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Разбивка по причинам */}
          {data.summary.offersCount > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Разбивка по причинам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(data.summary.byReason).map(([k, v]) => (
                    <div key={k} className="text-center">
                      <div className="text-xl font-bold text-gray-900">{v}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {RELEASE_REASON_LABELS[k] ?? k}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* История расставаний */}
          <Card>
            <CardHeader>
              <CardTitle>История расставаний с заказами</CardTitle>
            </CardHeader>
            <CardContent>
              {data.releases.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">
                  За период отказов и снятий не было
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Когда</TableHead>
                      <TableHead>Заказ</TableHead>
                      <TableHead className="w-[150px]">Событие</TableHead>
                      <TableHead>Комментарий</TableHead>
                      <TableHead className="w-[110px] text-right">Упущено</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.releases.map((r) => (
                      <TableRow key={r.assignmentId}>
                        <TableCell className="whitespace-nowrap text-sm text-gray-700">
                          {formatDateTime(r.releasedAt)}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/orders/${r.orderId}`}
                            className="text-sm text-gray-800 hover:text-primary transition"
                          >
                            {r.orderTitle}
                          </Link>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatDate(r.eventDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === "declined" ? "warning" : "alert"}>
                            {RELEASE_REASON_LABELS[r.releaseReason ?? ""] ?? (r.status === "declined" ? "Отказ" : "Снят")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {r.releaseComment ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold whitespace-nowrap">
                          −{fmtMoney(r.payout)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Отработанные заказы */}
          <Card>
            <CardHeader>
              <CardTitle>Отработанные заказы</CardTitle>
            </CardHeader>
            <CardContent>
              {data.items.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">
                  За период заказов нет
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Дата</TableHead>
                      <TableHead>Заказ</TableHead>
                      <TableHead className="w-[140px]">Клиент</TableHead>
                      <TableHead className="w-[110px]">Статус</TableHead>
                      <TableHead className="w-[110px] text-right">Выплата</TableHead>
                      <TableHead className="w-[130px]">Выплачено</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((it) => (
                      <TableRow key={it.orderId}>
                        <TableCell className="whitespace-nowrap text-gray-700 text-sm">
                          {formatDate(it.eventDate)}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/orders/${it.orderId}`}
                            className="text-sm font-medium text-gray-800 hover:text-primary transition"
                          >
                            {it.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {it.clientName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {ORDER_STATUS_LABELS[it.orderStatus as keyof typeof ORDER_STATUS_LABELS] ?? it.orderStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm font-semibold">
                          {fmtMoney(it.payout)}
                        </TableCell>
                        <TableCell>
                          {it.payoutPaidAt ? (
                            <Badge variant="success">Выплачено</Badge>
                          ) : (
                            <Badge variant="warning">К выплате</Badge>
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

function Row({
  label,
  value,
  valueClass,
  indent,
}: {
  label: string;
  value: string;
  valueClass?: string;
  indent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn("text-sm text-gray-600", indent && "pl-4 text-xs text-gray-500")}>
        {label}
      </span>
      <span className={cn("text-sm font-medium", valueClass ?? "text-gray-900")}>
        {value}
      </span>
    </div>
  );
}

function Metric({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: "primary" | "warn" | "danger";
}) {
  const colorClass =
    color === "primary"
      ? "text-primary"
      : color === "warn"
        ? "text-amber-600"
        : "text-red-600";
  return (
    <div className="text-center">
      <div className={cn("text-2xl font-bold", colorClass)}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
