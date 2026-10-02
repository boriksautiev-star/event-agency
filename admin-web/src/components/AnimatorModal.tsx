import { FormEvent, useEffect, useState } from "react";
import type { UserLite, UserStatus } from "../api/users";
import {
  useCreateUser,
  useUpdateUser,
} from "../hooks/useUsers";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Props = {
  open: boolean;
  animator: UserLite | null;
  onClose: () => void;
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Активен",
  blocked: "Заблокирован",
  invited: "Приглашён",
};

export function AnimatorModal({ open, animator, onClose }: Props) {
  const isEdit = !!animator;
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<UserStatus>("active");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName(animator?.firstName ?? "");
    setLastName(animator?.lastName ?? "");
    setPhone(animator?.phone ?? "");
    setEmail(animator?.email ?? "");
    setPassword("");
    setStatus(animator?.status ?? "active");
    setErr(null);
  }, [open, animator]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (firstName.trim().length < 2) return setErr("Имя — минимум 2 символа");
    if (lastName.trim().length < 2) return setErr("Фамилия — минимум 2 символа");
    if (phone.trim().length < 5) return setErr("Телефон обязателен");
    if (!isEdit && password.length < 6) return setErr("Пароль — минимум 6 символов");

    if (isEdit) {
      updateMut.mutate(
        {
          id: animator!.id,
          input: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            status,
          },
        },
        {
          onSuccess: () => onClose(),
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
        },
      );
    } else {
      createMut.mutate(
        {
          role: "animator",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          password,
        },
        {
          onSuccess: () => onClose(),
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось создать"),
        },
      );
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Изменить аниматора" : "Новый аниматор"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="an-last">Фамилия *</Label>
              <Input
                id="an-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="an-first">Имя *</Label>
              <Input
                id="an-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="an-phone">Телефон *</Label>
            <Input
              id="an-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7..."
            />
          </div>

          <div>
            <Label htmlFor="an-email">Email</Label>
            <Input
              id="an-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!isEdit ? (
            <div>
              <Label htmlFor="an-pass">Пароль *</Label>
              <Input
                id="an-pass"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 6 символов"
              />
              <p className="text-xs text-gray-500 mt-1">
                Сообщите пароль аниматору — он сможет войти в мобильное приложение.
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="an-status">Статус</Label>
              <Select
                id="an-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
              >
                {(Object.keys(STATUS_LABELS) as UserStatus[]).map((k) => (
                  <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                ))}
              </Select>
            </div>
          )}

          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохраняю…" : isEdit ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
