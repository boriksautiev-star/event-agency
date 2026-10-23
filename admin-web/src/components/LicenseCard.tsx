import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useLicense, useUploadLicense } from "../hooks/useLicense";

export function LicenseCard() {
  const { data, isLoading } = useLicense();
  const uploadMut = useUploadLicense();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setErr(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      try {
        await uploadMut.mutateAsync(text.trim());
        setMsg("Лицензия успешно загружена!");
      } catch (err: any) {
        setErr(err?.response?.data?.error ?? "Не удалось загрузить файл лицензии");
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (isLoading || !data) return null;

  const dateStr = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("ru-RU") : "—";
  
  return (
    <Card>
      <CardContent className="py-5 px-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Лицензия</h2>
          <p className="text-xs text-gray-400 mt-1">
            Статус вашей лицензии на использование Event Agency.
          </p>
        </div>

        <div className="text-sm space-y-1">
          <div><span className="text-gray-500">Агентство:</span> <b>{data.agencyName || "Не активирована"}</b></div>
          <div><span className="text-gray-500">Действует до:</span> <b>{dateStr}</b></div>
          {data.daysLeft !== null && (
            <div>
              <span className="text-gray-500">Осталось дней:</span> 
              <span className={data.daysLeft < 0 ? "text-red-600 font-bold ml-1" : ""}>{data.daysLeft}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Статус:</span> 
            <span className={`ml-1 font-semibold ${data.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
              {data.status === "active" ? "Активна" : data.reason}
            </span>
          </div>
        </div>

        {err && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</div>}
        {msg && <div className="text-sm text-green-700 bg-green-50 p-2 rounded">{msg}</div>}

        <div className="pt-2 border-t border-gray-100">
          <input type="file" accept=".key,.txt" ref={fileRef} onChange={onFile} className="hidden" />
          <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
            {uploadMut.isPending ? "Загрузка…" : "Загрузить новый файл (.key)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
