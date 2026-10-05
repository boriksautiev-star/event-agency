import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { useClients } from "../hooks/useClients";
import { useCreateOrder } from "../hooks/useOrders";
import { useAdmins } from "../hooks/useAdminPayroll";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../auth/AuthContext";
import { NewClientModal } from "../components/NewClientModal";
import { useCharacters } from "../hooks/useCharacters";
import { TRANSPORT_POLICY_LABELS } from "../lib/labels";
import { formatMoney } from "../lib/format";
import type { TransportPolicy } from "../api/types";

type LocalSlot = {
  key: string;
  characterId: string;
  characterName: string;
  rateDurationMinutes: number;
  clientPrice: number;
  isCustomPrice: boolean;
  sortOrder: number;
};

function addHour(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const total = (Number(m[1]) * 60 + Number(m[2]) + 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const min = total % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clients = [] } = useClients();
  const { data: characters = [] } = useCharacters({ activeOnly: true });
  const { data: adminsData } = useAdmins();
  const { data: settings } = useSettings();
  const createMut = useCreateOrder();

  const admins = useMemo(
    () => (adminsData?.items ?? []).filter((a) => a.status === "active"),
    [adminsData],
  );

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(todayIso());
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState(addHour("15:00"));
  const [endTouched, setEndTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [transportPolicy, setTransportPolicy] = useState<TransportPolicy>("client_one_way");
  const [adminId, setAdminId] = useState("");
  const [prepaymentAmount, setPrepaymentAmount] = useState("0");
  const [prepaymentTouched, setPrepaymentTouched] = useState(false);
  const [prepaymentPaid, setPrepaymentPaid] = useState(false);
  const [slots, setSlots] = useState<LocalSlot[]>([]);
  const [slotModal, setSlotModal] = useState<
    | { kind: "add" }
    | { kind: "edit"; index: number }
    | null
  >(null);
  const [err, setErr] = useState<string | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);

  // Дефолт админа: если текущий пользователь админ — он сам
  useEffect(() => {
    if (adminId) return;
    if (user?.role === "admin") setAdminId(user.id);
  }, [user, adminId]);

  // Автоподстановка времени окончания = начало + 1 час, если не тронуто вручную
  useEffect(() => {
    if (endTouched) return;
    setEndTime(addHour(startTime));
  }, [startTime, endTouched]);

  const subtotal = useMemo(
    () => slots.reduce((s, x) => s + x.clientPrice, 0),
    [slots],
  );
  const dpNum = Number(discountPercent.replace(",", ".")) || 0;
  const discountAmount = +(subtotal * (dpNum / 100)).toFixed(2);
  const clientPrice = +(subtotal - discountAmount).toFixed(2);

  // Автоподстановка предоплаты от % в настройках, пока пользователь не трогал поле
  useEffect(() => {
    if (prepaymentTouched) return;
    const pct = settings?.defaultPrepaymentPercent ?? 0;
    const suggested = +(clientPrice * (pct / 100)).toFixed(2);
    setPrepaymentAmount(suggested > 0 ? String(suggested) : "0");
  }, [clientPrice, settings?.defaultPrepaymentPercent, prepaymentTouched]);

  const addSlot = (slot: Omit<LocalSlot, "key" | "sortOrder">) => {
    setSlots((prev) => [
      ...prev,
      {
        ...slot,
        key: Math.random().toString(36).slice(2),
        sortOrder: prev.length,
      },
    ]);
  };

  const updateSlotAt = (index: number, slot: Omit<LocalSlot, "key" | "sortOrder">) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...slot } : s)),
    );
  };

  const removeSlotAt = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!clientId) return setErr("Выберите клиента");
    if (title.trim().length < 2) return setErr("Название минимум 2 символа");
    if (!/^\d{2}:\d{2}$/.test(startTime)) return setErr("Начало — формат HH:MM");
    if (!/^\d{2}:\d{2}$/.test(endTime)) return setErr("Конец — формат HH:MM");
    if (dpNum < 0 || dpNum > 100) return setErr("Скидка 0–100%");

    const prepayNum = Number(prepaymentAmount.replace(",", ".")) || 0;
    if (prepayNum < 0) return setErr("Предоплата — неотрицательное число");
    if (prepayNum > clientPrice) return setErr("Предоплата больше суммы заказа");

    createMut.mutate(
      {
        clientId,
        title: title.trim(),
        description: description.trim() || null,
        eventDate,
        startTime,
        endTime,
        address: address.trim() || null,
        comment: comment.trim() || null,
        discountPercent: dpNum,
        transportPolicy,
        prepaymentAmount: prepayNum,
        prepaymentPaid,
        adminId: adminId || null,
        slots: slots.map((s, i) => ({
          characterId: s.characterId,
          rateDurationMinutes: s.rateDurationMinutes,
          clientPrice: s.clientPrice,
          isCustomPrice: s.isCustomPrice,
          sortOrder: i,
        })),
      },
      {
        onSuccess: (order) => navigate(`/orders/${order.id}`),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось создать заказ"),
      },
    );
  };

  const defaultPercent = settings?.defaultPrepaymentPercent ?? 0;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="hover:text-primary transition"
          >
            Заказы
          </button>
          <span>/</span>
          <span className="text-gray-800 font-semibold">Новый заказ</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
          ← К списку
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Клиент и основное</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <Label htmlFor="no-client">Клиент *</Label>
                <button
                  type="button"
                  onClick={() => setNewClientOpen(true)}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  + Новый клиент
                </button>
              </div>
              <Select
                id="no-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— Выберите —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="no-title">Название *</Label>
              <Input
                id="no-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="День рождения Маши, 7 лет"
              />
            </div>

            <div>
              <Label htmlFor="no-desc">Описание</Label>
              <Textarea
                id="no-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Пиратская вечеринка, 10 детей"
              />
            </div>

            <div>
              <Label htmlFor="no-admin">Ответственный администратор</Label>
              <Select
                id="no-admin"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
              >
                <option value="">— Не назначен —</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.lastName} {a.firstName} · {a.phone}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                От выбранного админа зависит начисление зарплаты по этому заказу.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Когда и где</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="no-date">Дата *</Label>
                <Input id="no-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="no-start">Начало *</Label>
                <Input id="no-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="no-end">Конец *</Label>
                <Input
                  id="no-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setEndTouched(true);
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">По умолчанию +1 час от начала</p>
              </div>
            </div>
            <div>
              <Label htmlFor="no-addr">Адрес</Label>
              <Input id="no-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Персонажи и программа</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={() => setSlotModal({ kind: "add" })}>
                + Добавить слот
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <div className="text-sm text-gray-500">Персонажи не добавлены</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Персонаж</TableHead>
                    <TableHead className="w-[100px]">Длит.</TableHead>
                    <TableHead className="w-[120px] text-right">Цена</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((s, idx) => (
                    <TableRow key={s.key}>
                      <TableCell className="font-semibold text-gray-900">{s.characterName}</TableCell>
                      <TableCell className="text-gray-500">{s.rateDurationMinutes} мин</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatMoney(s.clientPrice)}
                        {s.isCustomPrice ? (
                          <Badge variant="warning" className="ml-2">вручную</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" className="!px-2" onClick={() => setSlotModal({ kind: "edit", index: idx })}>
                            <Pencil size={14} />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="!px-2 text-red-600" onClick={() => removeSlotAt(idx)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Финансы и транспорт</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="no-disc">Скидка, %</Label>
                <Input
                  id="no-disc"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="no-trans">Политика транспорта</Label>
                <Select
                  id="no-trans"
                  value={transportPolicy}
                  onChange={(e) => setTransportPolicy(e.target.value as TransportPolicy)}
                >
                  {(Object.keys(TRANSPORT_POLICY_LABELS) as TransportPolicy[]).map((k) => (
                    <option key={k} value={k}>{TRANSPORT_POLICY_LABELS[k]}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Программа (сумма)</span>
                <span className="font-medium">{formatMoney(subtotal)}</span>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Скидка {dpNum}%</span>
                  <span className="font-medium text-red-600">−{formatMoney(discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base pt-2 border-t border-gray-100">
                <span className="font-semibold">Итого для клиента</span>
                <span className="font-bold text-primary">{formatMoney(clientPrice)}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="no-prepay">Предоплата, ₽</Label>
                  <Input
                    id="no-prepay"
                    type="number"
                    min={0}
                    step={100}
                    value={prepaymentAmount}
                    onChange={(e) => {
                      setPrepaymentAmount(e.target.value);
                      setPrepaymentTouched(true);
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    По умолчанию {defaultPercent}% от суммы заказа. Изменение вручную отключает авторасчёт.
                  </p>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-1">
                    <input
                      type="checkbox"
                      checked={prepaymentPaid}
                      onChange={(e) => setPrepaymentPaid(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-gray-700">Оплачена сразу</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="no-comment">Комментарий</Label>
              <Textarea
                id="no-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </CardContent>
        </Card>

        {err ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/orders")} disabled={createMut.isPending}>
            Отмена
          </Button>
          <Button type="submit" size="lg" disabled={createMut.isPending}>
            {createMut.isPending ? "Создаю…" : "Создать заказ"}
          </Button>
        </div>
      </form>

      <NewClientModal
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        onCreated={(id) => setClientId(id)}
      />

      {slotModal ? (
        <NewOrderSlotModal
          mode={slotModal}
          slots={slots}
          characters={characters}
          onClose={() => setSlotModal(null)}
          onAdd={(s) => { addSlot(s); setSlotModal(null); }}
          onUpdate={(idx, s) => { updateSlotAt(idx, s); setSlotModal(null); }}
        />
      ) : null}
    </div>
  );
}

// ============ Внутренняя модалка слота ============
type NewOrderSlotModalProps = {
  mode: { kind: "add" } | { kind: "edit"; index: number };
  slots: LocalSlot[];
  characters: { id: string; name: string; rateGroup?: { id: string; name: string } }[];
  onClose: () => void;
  onAdd: (s: Omit<LocalSlot, "key" | "sortOrder">) => void;
  onUpdate: (index: number, s: Omit<LocalSlot, "key" | "sortOrder">) => void;
};

function NewOrderSlotModal({ mode, slots, characters, onClose, onAdd, onUpdate }: NewOrderSlotModalProps) {
  const isEdit = mode.kind === "edit";
  const initial = isEdit ? slots[mode.index] : null;

  const [characterId, setCharacterId] = useState(initial?.characterId ?? "");
  const [durationMin, setDurationMin] = useState<number | null>(initial?.rateDurationMinutes ?? null);
  const [price, setPrice] = useState(initial ? String(initial.clientPrice) : "");
  const [err, setErr] = useState<string | null>(null);

  const { data: characterDetail } = useCharacterSafe(characterId || undefined);
  const priceOptions = (characterDetail?.priceOptions ?? [])
    .filter((p) => p.isActive)
    .sort((a, b) => a.durationMin - b.durationMin);

  const basePrice = durationMin == null
    ? null
    : (priceOptions.find((p) => p.durationMin === durationMin)?.price ?? null);

  const priceNum = Number(price.replace(",", "."));
  const isCustom = basePrice != null && Number.isFinite(priceNum) && Number(basePrice) !== priceNum;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!characterId) return setErr("Выберите персонажа");
    if (durationMin == null) return setErr("Выберите длительность");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setErr("Цена должна быть неотрицательным числом");

    const char = characters.find((c) => c.id === characterId);
    const payload = {
      characterId,
      characterName: char?.name ?? "",
      rateDurationMinutes: durationMin,
      clientPrice: priceNum,
      isCustomPrice: isCustom,
    };

    if (isEdit) onUpdate(mode.index, payload);
    else onAdd(payload);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Изменить слот" : "Добавить слот"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Персонаж *</Label>
            <Select value={characterId} onChange={(e) => { setCharacterId(e.target.value); setDurationMin(null); setPrice(""); }}>
              <option value="">— Выберите —</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.rateGroup ? ` (${c.rateGroup.name})` : ""}</option>
              ))}
            </Select>
          </div>
          {characterId ? (
            <div>
              <Label>Длительность *</Label>
              <Select value={durationMin == null ? "" : String(durationMin)} onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setDurationMin(v);
                const opt = priceOptions.find((p) => p.durationMin === v);
                if (opt) setPrice(String(Number(opt.price)));
              }}>
                <option value="">— Выберите —</option>
                {priceOptions.map((p) => (
                  <option key={p.id} value={String(p.durationMin)}>
                    {p.durationMin} мин · {Number(p.price).toLocaleString("ru-RU")} ₽
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {durationMin != null ? (
            <div>
              <Label>Цена для клиента, ₽ *</Label>
              <Input type="number" min={0} step={100} value={price} onChange={(e) => setPrice(e.target.value)} />
              {basePrice != null ? (
                <p className="text-xs text-gray-500 mt-1">
                  {isCustom
                    ? `Цена изменена вручную (базовая: ${Number(basePrice).toLocaleString("ru-RU")} ₽).`
                    : `Цена из справочника.`}
                </p>
              ) : null}
            </div>
          ) : null}
          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit">{isEdit ? "Сохранить" : "Добавить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Хелпер — чтобы не тащить лишние импорты
import { useCharacter as useCharacterSafe } from "../hooks/useCharacters";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
