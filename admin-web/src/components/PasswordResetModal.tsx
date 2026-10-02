import { FormEvent, useEffect, useState } from "react";
import { useUpdateUserPassword } from "../hooks/useUsers";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Props = {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
};

export function PasswordResetModal({ open, userId, userName, onClose }: Props) {
  const mut = useUpdateUserPassword();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setErr(null);
    }
  }, [open]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) return setErr("Пароль — минимум 6 символов");

    mut.mutate(
      { id: userId, password },
      {
        onSuccess: () => onClose(),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось сбросить пароль"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Сбросить пароль</DialogTitle>
          <DialogDescription>
            Новый пароль для {userName}. Сообщите его аниматору лично.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="pr-pass">Новый пароль *</Label>
            <Input
              id="pr-pass"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="минимум 6 символов"
            />
          </div>

          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending}>
              Отмена
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Меняю…" : "Сбросить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
