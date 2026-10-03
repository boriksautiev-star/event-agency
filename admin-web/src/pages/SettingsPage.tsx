import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useSettings();
  const updateMut = useUpdateSettings();

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [inn, setInn] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("");
  const [currency, setCurrency] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [prepayPercent, setPrepayPercent] = useState("30");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setLegalName(data.legalName ?? "");
    setInn(data.inn ?? "");
    setPhone(data.phone ?? "");
    setEmail(data.email ?? "");
    setAddress(data.address ?? "");
    setWebsite(data.website ?? "");
    setTimezone(data.timezone ?? "Europe/Moscow");
    setCurrency(data.currency ?? "RUB");
    setPaymentDetails(data.paymentDetails ?? "");
    setLogoUrl(data.logoUrl ?? "");
    setPrepayPercent(String(data.defaultPrepaymentPercent ?? 30));
  }, [data]);

  if (user?.role !== "director") {
    return <Navigate to="/orders" replace />;
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (name.trim().length < 1) return setErr("Название не может быть пустым");
    const pct = Number(prepayPercent);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      return setErr("Процент предоплаты — целое число от 0 до 100");
    }
    updateMut.mutate(
      {
        name: name.trim(),
        legalName: legalName.trim() || null,
        inn: inn.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
        timezone: timezone.trim(),
        currency: currency.trim(),
        paymentDetails: paymentDetails.trim() || null,
        logoUrl: logoUrl.trim() || null,
        defaultPrepaymentPercent: pct,
      },
      {
        onSuccess: () => setOk("Сохранено"),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
      },
    );
  };

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500">Загрузка…</div>;
  }
  if (isError) {
    return (
      <div className="p-10 text-center text-red-600">
        Ошибка: {(error as any)?.response?.data?.error ?? "Не удалось загрузить"}
      </div>
    );
  }

  const isPending = updateMut.isPending;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Настройки агентства</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardContent className="py-5 px-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Общее</h2>

            <div>
              <Label htmlFor="s-name">Название *</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-legal">Юр. название</Label>
                <Input id="s-legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-inn">ИНН</Label>
                <Input id="s-inn" value={inn} onChange={(e) => setInn(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-phone">Телефон</Label>
                <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-email">Email</Label>
                <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="s-address">Адрес</Label>
              <Input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-website">Сайт</Label>
                <Input id="s-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-logo">URL логотипа</Label>
                <Input id="s-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5 px-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Регион и валюта</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-tz">Часовой пояс</Label>
                <Input id="s-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Moscow" />
              </div>
              <div>
                <Label htmlFor="s-currency">Валюта</Label>
                <Input id="s-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="RUB" />
              </div>
            </div>

            <div>
              <Label htmlFor="s-prepay">Дефолт. процент предоплаты</Label>
              <Input
                id="s-prepay"
                type="number"
                min={0}
                max={100}
                step={1}
                value={prepayPercent}
                onChange={(e) => setPrepayPercent(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Применяется при создании нового заказа, если не указано иное.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5 px-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Реквизиты для оплат</h2>
            <div>
              <Label htmlFor="s-pay">Текст (р/с, банк, БИК)</Label>
              <Textarea
                id="s-pay"
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                className="min-h-[100px]"
                placeholder="Можно отправить клиенту в SMS/push"
              />
            </div>
          </CardContent>
        </Card>

        {err ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </div>
        ) : null}
        {ok ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {ok}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Сохраняю…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </div>
  );
}
