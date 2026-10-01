import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ORDER_STATUS_LABELS } from "@event-agency/shared";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useOrders } from "../hooks/useOrders";
import { useDebounce } from "../hooks/useDebounce";
import { ORDER_STATUS_BADGE } from "../lib/orderStatus";
import { formatDate, formatDateTime, formatMoney, formatTimeRange } from "../lib/format";
import { cn } from "../lib/utils";

type Tab = "all" | "active" | "completed" | "cancelled";

const TAB_STATUSES: Record<Tab, string | undefined> = {
  all: undefined,
  active: "new,confirmed,in_progress",
  completed: "completed",
  cancelled: "cancelled",
};

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "completed", label: "Выполненные" },
  { key: "cancelled", label: "Отменённые" },
];

const PAGE_SIZES = [25, 50, 100];

export default function OrdersPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = useDebounce(searchInput, 400);

  useEffect(() => {
    setPage(1);
  }, [tab, search, dateFrom, dateTo, createdFrom, createdTo, pageSize]);

  const { data, isLoading, isError, error, isFetching } = useOrders({
    statusIn: TAB_STATUSES[tab],
    search: search.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = data?.items ?? [];

  const activeFiltersCount = [searchInput, dateFrom, dateTo, createdFrom, createdTo].filter(Boolean).length;
  const hasAnyFilters = tab !== "all" || activeFiltersCount > 0;

  const resetFilters = () => {
    setTab("all");
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setCreatedFrom("");
    setCreatedTo("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Заказы</CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                Всего: <span className="font-semibold text-gray-800">{total}</span>
                {isFetching ? <span className="ml-2 text-xs text-primary">…</span> : null}
              </div>
              <Button onClick={() => navigate("/orders/new")}>+ Новый заказ</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
                  tab === t.key ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-primary transition"
            >
              {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Фильтры
              {activeFiltersCount > 0 ? (
                <Badge variant="primary">{activeFiltersCount}</Badge>
              ) : null}
            </button>
            {hasAnyFilters && !filtersOpen ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Сбросить
              </button>
            ) : null}
          </div>

          {filtersOpen ? (
            <div className="space-y-3 pt-1">
              <Input
                placeholder="Поиск по названию, адресу или имени клиента"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Дата события
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="С даты" />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="По дату" />
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Дата создания
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} title="Создан с" />
                  <Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} title="Создан по" />
                </div>
              </div>

              {hasAnyFilters ? (
                <div>
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Сбросить фильтры
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
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
          <div className="p-10 text-center text-gray-500">Ничего не найдено</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] whitespace-nowrap">Дата</TableHead>
                  <TableHead className="w-[110px] whitespace-nowrap">Время</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead className="w-[130px]">Статус</TableHead>
                  <TableHead className="w-[110px] text-right whitespace-nowrap">Цена</TableHead>
                  <TableHead className="w-[90px] text-center whitespace-nowrap">Аним.</TableHead>
                  <TableHead className="w-[130px] whitespace-nowrap">Создан</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((o) => {
                  const activeAnimators = (o.animators ?? []).filter(
                    (a) => a.status !== "removed" && a.status !== "declined",
                  );
                  return (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <TableCell className="font-medium whitespace-nowrap">{formatDate(o.eventDate)}</TableCell>
                      <TableCell className="text-gray-500 whitespace-nowrap">
                        {formatTimeRange(o.startTime, o.endTime)}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        <span className="line-clamp-2">{o.title}</span>
                      </TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">{o.client?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={ORDER_STATUS_BADGE[o.status]}>
                          {ORDER_STATUS_LABELS[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatMoney(o.clientPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        {activeAnimators.length > 0 ? (
                          <span className="text-gray-800 font-medium">{activeAnimators.length}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(o.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Страница</span>
                <span className="font-semibold text-gray-900">{page}</span>
                <span>из</span>
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">
                  По:
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="ml-2 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                  >
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Назад</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Вперёд →</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
