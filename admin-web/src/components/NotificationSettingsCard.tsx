import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "../hooks/useNotificationSettings";

export function NotificationSettingsCard() {
  const { data, isLoading, isError } = useNotificationSettings();
  const updateMut = useUpdateNotificationSettings();
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, boolean> = {};
    for (const s of data) next[s.eventType] = s.isEnabled;
    setDraft(next);
  }, [data]);

  const toggle = (eventType: string) => {
    setDraft((prev) => ({ ...prev, [eventType]: !prev[eventType] }));
    setOk(null);
    setErr(null);
  };

  const onSave = () => {
    setOk(null);
    setErr(null);
    const settings = Object.entries(draft).map(([eventType, isEnabled]) => ({ eventType, isEnabled }));
    updateMut.mutate(settings, {
      onSuccess: () => setOk("Настройки уведомлений сохранены"),
      onError: (e: any) =>
        setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-5 px-5">
          <div className="text-sm text-gray-500">Загрузка настроек уведомлений…</div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-5 px-5">
          <div className="text-sm text-red-600">Не удалось загрузить настройки уведомлений</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-5 px-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Уведомления (push)</h2>
          <p className="text-xs text-gray-400 mt-1">
            Выберите, какие события присылать вам на устройство. Работает только для push-уведомлений.
          </p>
        </div>

        <div className="space-y-2">
          {data.map((s) => (
            <div
              key={s.eventType}
              className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-b-0"
            >
              <div className="text-sm text-gray-800">{s.label}</div>
              <button
                type="button"
                onClick={() => toggle(s.eventType)}
                role="switch"
                aria-checked={!!draft[s.eventType]}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  draft[s.eventType] ? "bg-primary" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    draft[s.eventType] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

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

        <div className="flex items-center gap-3 pt-1">
          <Button type="button" onClick={onSave} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Сохраняю…" : "Сохранить уведомления"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
