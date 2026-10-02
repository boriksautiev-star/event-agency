import { FormEvent, useEffect, useState } from "react";
import type { Client } from "../api/types";
import {
  useCreateClient,
  useUpdateClient,
} from "../hooks/useClients";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Props = {
  open: boolean;
  client: Client | null;
  onClose: () => void;
};

export function ClientModal({ open, client, onClose }: Props) {
  const isEdit = !!client;
  const createMut = useCreateClient();
  const updateMut = useUpdateClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? "");
    setPhone(client?.phone ?? "");
    setEmail(client?.email ?? "");
    setAddress(client?.address ?? "");
    setNotes(client?.notes ?? "");
    setErr(null);
  }, [open, client]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (name.trim().length < 2) return setErr("Имя — минимум 2 символа");
    if (phone.trim().length < 5) return setErr("Телефон обязателен");

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    if (isEdit) {
      updateMut.mutate(
        { id: client!.id, input: payload },
        {
          onSuccess: () => onClose(),
          onError: (e: any) =>
            setErr(e?.response?.data?.error ?? "Не удалось сохранить"),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось создать"),
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Изменить клиента" : "Новый клиент"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="cl-name">Имя *</Label>
            <Input
              id="cl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Петров Пётр"
            />
          </div>

          <div>
            <Label htmlFor="cl-phone">Телефон *</Label>
            <Input
              id="cl-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7..."
            />
          </div>

          <div>
            <Label htmlFor="cl-email">Email</Label>
            <Input
              id="cl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cl-address">Адрес</Label>
            <Input
              id="cl-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cl-notes">Заметки</Label>
            <Textarea
              id="cl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

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
