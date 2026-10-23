import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { usePrepareRestore } from "../hooks/useBackups";

export function RestoreBackupModal({
  fileName,
  onClose,
}: {
  fileName: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [command, setCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mut = usePrepareRestore();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCommand(null);
    mut.mutate({ password, fileName }, {
      onSuccess: (res) => setCommand(res.command),
      onError: (err: any) => setError(err?.response?.data?.error ?? "Ошибка"),
    });
  };

  const copyToClipboard = () => {
    if (command) {
      navigator.clipboard.writeText(command);
      alert("Команда скопирована в буфер обмена");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Восстановить из бэкапа</h2>
        <div className="text-sm text-gray-600">
          Файл: <b>{fileName}</b>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <b>Внимание!</b> Это перезапишет текущую базу данных. Перед восстановлением
          будет создан safety-бэкап, но убедитесь, что вы понимаете последствия.
        </div>

        {!command ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="restore-password">Ваш пароль (директора)</Label>
              <Input
                id="restore-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={mut.isPending || !password}>
                {mut.isPending ? "Проверка…" : "Подтвердить"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              ✅ Safety-бэкап создан. Пароль верный.
            </div>
            <div className="text-sm text-gray-600">
              Выполните следующую команду на сервере в PowerShell:
            </div>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs font-mono break-all select-all">
              {command}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={copyToClipboard}>
                Скопировать команду
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
