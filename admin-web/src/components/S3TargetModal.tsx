import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAddS3Target, useUpdateS3Target, useTestS3Uncommitted } from "../hooks/useBackups";

type Props = {
  target?: any | null;
  onClose: () => void;
};

export function S3TargetModal({ target, onClose }: Props) {
  const isEdit = !!target;
  const [form, setForm] = useState({
    name: target?.name || "",
    endpoint: target?.endpoint || "",
    region: target?.region || "us-east-1",
    bucket: target?.bucket || "",
    accessKey: target?.accessKey || "",
    secretKey: "",
    pathPrefix: target?.pathPrefix || "",
    retentionDays: target?.retentionDays ?? 90,
  });
  const [testStatus, setTestStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const addMut = useAddS3Target();
  const updMut = useUpdateS3Target();
  const testMut = useTestS3Uncommitted();

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const runTest = () => {
    setTestStatus(null);
    if (!form.bucket || !form.accessKey || !form.secretKey) {
      setTestStatus({ ok: false, error: "Заполните bucket, accessKey, secretKey" });
      return;
    }
    testMut.mutate(form, {
      onSuccess: (r) => setTestStatus(r),
      onError: (e: any) => setTestStatus({ ok: false, error: e?.response?.data?.error ?? "Ошибка" }),
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const payload: any = { ...form };
    if (isEdit && !form.secretKey) delete payload.secretKey;
    const action = isEdit
      ? updMut.mutateAsync({ id: target.id, input: payload })
      : addMut.mutateAsync(payload);
    action
      .then(() => onClose())
      .catch((e: any) => setErr(e?.response?.data?.error ?? "Не удалось сохранить"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 my-8">
        <h2 className="text-lg font-bold text-gray-900">
          {isEdit ? "Изменить S3-таргет" : "Добавить S3-таргет"}
        </h2>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <Label>Бакет (bucket) *</Label>
              <Input value={form.bucket} onChange={(e) => set("bucket", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Адрес сервера (endpoint)</Label>
              <Input value={form.endpoint} onChange={(e) => set("endpoint", e.target.value)} placeholder="https://storage.yandexcloud.net" />
            </div>
            <div>
              <Label>Регион</Label>
              <Input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="ru-central1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Ключ доступа (access key) *</Label>
              <Input value={form.accessKey} onChange={(e) => set("accessKey", e.target.value)} required />
            </div>
            <div>
              <Label>Секретный ключ (secret key) {isEdit ? "(оставьте пустым, чтобы не менять)" : "*"}</Label>
              <Input type="password" value={form.secretKey} onChange={(e) => set("secretKey", e.target.value)} required={!isEdit} placeholder={isEdit ? "****" : ""} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Префикс пути (path prefix)</Label>
              <Input value={form.pathPrefix} onChange={(e) => set("pathPrefix", e.target.value)} placeholder="event-agency/prod/" />
            </div>
            <div>
              <Label>Хранить дней в облаке</Label>
              <Input type="number" min={1} value={form.retentionDays} onChange={(e) => set("retentionDays", Number(e.target.value))} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="button" variant="outline" onClick={runTest} disabled={testMut.isPending}>
              {testMut.isPending ? "Проверка…" : "Проверить подключение"}
            </Button>
            {testStatus && (
              <span className={`text-sm ${testStatus.ok ? "text-green-700" : "text-red-600"}`}>
                {testStatus.ok ? "✅ OK" : `❌ ${testStatus.error}`}
              </span>
            )}
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</div>}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={addMut.isPending || updMut.isPending}>
              {isEdit ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
