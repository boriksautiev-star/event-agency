import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import { useFinanceSummary } from "../../hooks/useFinance";
import { downloadExport } from "../../api/finance";
import {
  getPreset,
  todayIso,
  fmtMoney,
  fmtNumber,
  type Preset,
} from "../../lib/financeHelpers";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "this_month", label: "Месяц" },
  { key: "last_month", label: "Прошлый" },
  { key: "this_year", label: "Год" },
  { key: "custom", label: "Свой" },
];

export default function FinanceOverviewPage() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState(todayIso().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayIso());
  const [exporting, setExporting] = useState<string | null>(null);

  const period = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPreset(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading, isError, error } = useFinanceSummary(period);

  const periodLabel = useMemo(() => {
    if (preset === "this_month") return "Текущий месяц";
    if (preset === "last_month") return "Прошлый месяц";
    if (preset === "this_year") return "Текущий год";
    return "Свой период";
  }, [preset]);

  const onExport = async (kind: "orders" | "payouts" | "expenses") => {
    setExporting(kind);
    try {
      const { blob, filename } = await downloadExport(kind, period.from, period.to);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Не удалось экспортировать");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
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
          {/* Плановая сводка */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>{periodLabel}</CardTitle>
                <div className="text-sm text-gray-500">
                  {data.period.from} → {data.period.to}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label="Выручка (план)" value={fmtMoney(data.revenue)} valueClass="text-emerald-600 font-semibold" />
              <Row label="Выплаты аниматорам" value={"−" + fmtMoney(data.payouts)} />
              <Row label="Транспорт (агентство)" value={"−" + fmtMoney(data.transportAgency)} />
              <Row label="Прочие расходы" value={"−" + fmtMoney(data.otherExpenses)} />
              <div className="border-t border-gray-100 my-2" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Прибыль (план)</span>
                <span
                  className={cn(
                    "text-xl font-extrabold",
                    data.profit >= 0 ? "text-primary" : "text-red-600",
                  )}
                >
                  {fmtMoney(data.profit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Поступления */}
          <Card>
            <CardHeader>
              <CardTitle>Поступления от клиентов</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="py-2">
                <div className="text-3xl font-extrabold text-emerald-600">
                  {fmtMoney(data.income.total)}
                </div>
              </div>
              <Row label="Предоплаты" value={fmtMoney(data.income.prepayments)} />
              <Row label="Финал" value={fmtMoney(data.income.finals)} />
              {data.income.refunds > 0 ? (
                <Row
                  label="Возвраты"
                  value={"−" + fmtMoney(data.income.refunds)}
                  valueClass="text-red-600"
                />
              ) : null}
              <p className="text-xs text-gray-500 pt-1">
                переводом {fmtMoney(data.income.byMethod.transfer)} · наличными {fmtMoney(data.income.byMethod.cash)}
              </p>
              <div className="border-t border-gray-100 my-2" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Кассовая прибыль</span>
                <span
                  className={cn(
                    "text-xl font-extrabold",
                    data.cashProfit >= 0 ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {fmtMoney(data.cashProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Показатели */}
          <Card>
            <CardHeader>
              <CardTitle>Показатели</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Metric value={String(data.ordersCount)} label="Заказов" />
                <Metric value={String(data.animatorsCount)} label="Аниматоров" />
                <Metric value={fmtNumber(data.workHours)} label="Часов" />
              </div>
            </CardContent>
          </Card>

          {/* Экспорт */}
          <Card>
            <CardHeader>
              <CardTitle>Экспорт Excel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-gray-500">
                Файлы открываются в Excel или Google Sheets.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => onExport("orders")}
                  disabled={!!exporting}
                >
                  {exporting === "orders" ? "Готовлю…" : "📄 Заказы"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onExport("payouts")}
                  disabled={!!exporting}
                >
                  {exporting === "payouts" ? "Готовлю…" : "💸 Выплаты"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onExport("expenses")}
                  disabled={!!exporting}
                >
                  {exporting === "expenses" ? "Готовлю…" : "🧾 Расходы"}
                </Button>
              </div>
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
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={cn("text-sm font-medium", valueClass ?? "text-gray-900")}>
        {value}
      </span>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
