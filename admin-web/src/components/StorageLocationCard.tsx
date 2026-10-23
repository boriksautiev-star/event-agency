import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { useStorageSettings, useUpdateBackupDir, useDeleteS3Target, useTestS3Saved } from "../hooks/useBackups";
import { S3TargetModal } from "./S3TargetModal";
import { DirectoryPickerModal } from "./DirectoryPickerModal";

export function StorageLocationCard() {
  const { data, isLoading } = useStorageSettings();
  const updDir = useUpdateBackupDir();
  const delTarget = useDeleteS3Target();
  const testSaved = useTestS3Saved();
  const [backupDir, setBackupDir] = useState("");
  const [modalTarget, setModalTarget] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);

  if (isLoading || !data) return null;

  const currentDir = backupDir || data.backupDir;

  const onSaveDir = () => {
    setMsg(null);
    updDir.mutate(currentDir, {
      onSuccess: () => { setMsg("Путь сохранён"); setBackupDir(""); },
      onError: (e: any) => setMsg(e?.response?.data?.error ?? "Ошибка"),
    });
  };

  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Удалить таргет "${name}"?`)) return;
    delTarget.mutate(id);
  };

  const onTest = (id: string) => {
    setTestStatus((p) => ({ ...p, [id]: "Проверка…" }));
    testSaved.mutate(id, {
      onSuccess: (r) => setTestStatus((p) => ({ ...p, [id]: r.ok ? "✅ OK" : `❌ ${r.error}` })),
    });
  };

  return (
    <>
      <Card>
        <CardContent className="py-5 px-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Место хранения бэкапов</h2>
            <p className="text-xs text-gray-400 mt-1">
              Локальная папка (обязательно) + опциональные S3-таргеты (Яндекс, VK, AWS, MinIO).
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-600">📁 Локальный путь</div>
            <div className="flex items-center gap-2">
              <Input
                value={currentDir}
                onChange={(e) => setBackupDir(e.target.value)}
                placeholder="D:\Backups или \\nas\share"
              />
              <Button variant="outline" onClick={() => setShowPicker(true)}>Обзор…</Button>
              <Button onClick={onSaveDir} disabled={updDir.isPending}>
                {updDir.isPending ? "Сохранение…" : "Сохранить"}
              </Button>
            </div>
            {msg && <div className="text-xs text-gray-600">{msg}</div>}
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-600">☁️ S3-таргеты ({data.s3Targets.length})</div>
              <Button size="sm" onClick={() => { setModalTarget(null); setShowModal(true); }}>
                + Добавить
              </Button>
            </div>
            {data.s3Targets.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">Нет S3-таргетов. Бэкапы только локально.</div>
            ) : (
              <div className="space-y-2">
                {data.s3Targets.map((t: any) => (
                  <div key={t.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {t.enabled ? "✅" : "⏸"} {t.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          bucket: {t.bucket} · region: {t.region}
                        </div>
                        {testStatus[t.id] && (
                          <div className="text-xs mt-1">{testStatus[t.id]}</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => onTest(t.id)}>
                          Тест
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setModalTarget(t); setShowModal(true); }}>
                          Изменить
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDelete(t.id, t.name)}>
                          ×
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showPicker && (
        <DirectoryPickerModal
          initialPath={currentDir.startsWith("\\\\") || /^[A-Za-z]:/.test(currentDir) ? currentDir : undefined}
          onSelect={(p) => { setBackupDir(p); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showModal && (
        <S3TargetModal
          target={modalTarget}
          onClose={() => { setShowModal(false); setModalTarget(null); }}
        />
      )}
    </>
  );
}
