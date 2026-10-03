import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import type { ExpenseItem, ExpenseCategory } from "../../api/finance";
import {
  useExpenses,
  useExpenseCategories,
  useDeleteExpense,
  useDeleteCategory,
} from "../../hooks/useFinance";
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
import { ExpenseModal } from "../../components/ExpenseModal";
import { ExpenseCategoryModal } from "../../components/ExpenseCategoryModal";
import { fmtMoney } from "../../lib/financeHelpers";
import { formatDate } from "../../lib/format";

type SubTab = "expenses" | "categories";

export default function FinanceExpensesPage() {
  const [subTab, setSubTab] = useState<SubTab>("expenses");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "expenses", label: "Расходы" },
          { key: "categories", label: "Категории" },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSubTab(t.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
              subTab === t.key
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "expenses" ? <ExpensesList /> : <CategoriesList />}
    </div>
  );
}

// ====== Расходы ======
function ExpensesList() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const { data: categories = [] } = useExpenseCategories();

  const query = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      categoryId: categoryId || undefined,
      limit: 200,
    }),
    [from, to, categoryId],
  );

  const { data, isLoading, isError, error } = useExpenses(query);
  const items = data?.items ?? [];
  const sum = data?.sum ?? 0;

  const deleteMut = useDeleteExpense();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);

  const categoriesSorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const activeFiltersCount = (from ? 1 : 0) + (to ? 1 : 0) + (categoryId ? 1 : 0);

  const resetFilters = () => {
    setFrom("");
    setTo("");
    setCategoryId("");
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (e: ExpenseItem) => {
    setEditing(e);
    setModalOpen(true);
  };

  const handleDelete = (e: ExpenseItem) => {
    if (!window.confirm(`Удалить расход «${e.category.name} — ${fmtMoney(e.amount)}»?`)) return;
    deleteMut.mutate(e.id, {
      onError: (err: any) =>
        alert(err?.response?.data?.error ?? "Не удалось удалить расход"),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Все категории</option>
              {categoriesSorted.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="С" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="По" />
            <Button onClick={openCreate}>+ Добавить расход</Button>
          </div>

          {activeFiltersCount > 0 ? (
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <div className="text-xs text-gray-500">
                Активных фильтров: {activeFiltersCount}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 px-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-gray-500">
            Записей: <span className="font-semibold text-gray-800">{items.length}</span>
          </div>
          <div className="text-sm text-gray-500">
            Сумма: <span className="font-semibold text-red-600">−{fmtMoney(sum)}</span>
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
          <div className="p-10 text-center text-gray-500">Расходов нет</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px] whitespace-nowrap">Дата</TableHead>
                <TableHead className="w-[180px]">Категория</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead className="w-[130px] text-right whitespace-nowrap">Сумма</TableHead>
                <TableHead>Комментарий</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {formatDate(e.expenseDate)}
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">
                    {e.category.name}
                  </TableCell>
                  <TableCell>
                    {e.order ? (
                      <Link
                        to={`/orders/${e.order.id}`}
                        className="text-sm text-gray-800 hover:text-primary transition"
                      >
                        {e.order.title}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600 whitespace-nowrap">
                    −{fmtMoney(e.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    <span className="line-clamp-2">{e.comment ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        title="Изменить"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2 text-red-600 hover:text-red-700"
                        title="Удалить"
                        onClick={() => handleDelete(e)}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ExpenseModal
        open={modalOpen}
        expense={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// ====== Категории ======
function CategoriesList() {
  const { data: categories = [], isLoading, isError, error } = useExpenseCategories();
  const deleteMut = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: ExpenseCategory) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleDelete = (c: ExpenseCategory) => {
    const count = c._count?.expenses ?? 0;
    const msg =
      count > 0
        ? `В категории ${count} расход(ов). Удалить можно только пустые. Продолжить?`
        : `Удалить категорию «${c.name}»?`;
    if (!window.confirm(msg)) return;
    deleteMut.mutate(c.id, {
      onError: (e: any) =>
        alert(e?.response?.data?.error ?? "Не удалось удалить категорию"),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-500">
            Всего: <span className="font-semibold text-gray-800">{categories.length}</span>
          </div>
          <Button onClick={openCreate}>+ Добавить категорию</Button>
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Загрузка…</div>
        ) : isError ? (
          <div className="p-10 text-center text-red-600">
            Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Категорий нет</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px] text-center">Порядок</TableHead>
                <TableHead>Название</TableHead>
                <TableHead className="w-[120px]">Статус</TableHead>
                <TableHead className="w-[150px] text-center">Расходов</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const count = c._count?.expenses ?? 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-center text-gray-500">{c.sortOrder}</TableCell>
                    <TableCell className="font-semibold text-gray-900">{c.name}</TableCell>
                    <TableCell>
                      {c.isActive ? (
                        <Badge variant="success">Активна</Badge>
                      ) : (
                        <Badge variant="default">Выключена</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">{count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2"
                          title="Изменить"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2 text-red-600 hover:text-red-700"
                          title="Удалить"
                          onClick={() => handleDelete(c)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <ExpenseCategoryModal
        open={modalOpen}
        category={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
