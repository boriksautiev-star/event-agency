import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useBackups, useBackupStatus, useCreateBackup } from "../hooks/useBackups";
import { RestoreBackupModal } from "./RestoreBackupModal";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function BackupsCard() {
  const { data: status, isLoading: statusLoading } = useBackupStatus();
  const { data: items, isLoading: listLoading } = useBackups();
  const createMut = useCreateBackup();
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onCreate = () => {
    setMsg(null);
    createMut.mutate(undefined, {
      onSuccess: () => setMsg("Бэкап успешно создан"),
      onError: (e: any) => setMsg(e?.response?.data?.error ?? "Ошибка при создании"),
    });
  };

  if (statusLoading || listLoading || !status || !items) return null;

  return (
    <>
      <Card>
        <CardContent className="py-5 px-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Резервные копии</h2>
            <p className="text-xs text-gray-400 mt-1">
              Ежедневные бэкапы БД. Хранение: 30 дней + 12 месяцев.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">Последний успешный</div>
              <div className="font-semibold">{fmtDate(status.lastSuccessAt)}</div>
              {status.ageHours !== null && (
                <div className="text-xs text-gray-500 mt-1">
                  {status.ageHours} ч назад · {status.lastSuccessSize ? fmtSize(status.lastSuccessSize) : "—"}
                </div>
              )}
            </div>
            <div className={`border rounded-lg p-3 ${status.isStale ? "border-red-300 bg-red-50" : ""}`}>
              <div className="text-xs text-gray-500">Статус</div>
              <div className={`font-semibold ${status.isStale ? "text-red-700" : "text-green-700"}`}>
                {status.isStale ? "⚠️ Требуется бэкап" : "✅ Свежий"}
              </div>
              <div className="text-xs text-gray-500 mt-1">Порог: {status.thresholdHours} ч</div>
            </div>
          </div>

          {msg && (
            <div className="text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-2">
              {msg}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={onCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "Создание…" : "Создать бэкап сейчас"}
            </Button>
          </div>

          <div className="border-t pt-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">Последние бэкапы</div>
            {items.length === 0 ? (
              <div className="text-sm text-gray-400">Бэкапов пока нет</div>
            ) : (
              <div className="space-y-1">
                {items.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs truncate">{b.fileName}</div>
                      <div className="text-xs text-gray-400">
                        {fmtDate(b.createdAt)} · {fmtSize(b.sizeBytes)} · {b.triggeredBy}
                      </div>
                    </div>
                    {b.status === "success" && b.fileExists ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRestoreFile(b.fileName)}
                      >
                        Восстановить
                      </Button>
                    ) : (
                      <span className="text-xs text-red-600">{b.status === "failed" ? "Ошибка" : "Файл отсутствует"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {restoreFile && (
        <RestoreBackupModal fileName={restoreFile} onClose={() => setRestoreFile(null)} />
      )}
    </>
  );
}
