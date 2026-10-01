import { FormEvent, useEffect, useState } from "react";
import { useCreateClient } from "../hooks/useClients";
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
  onClose: () => void;
  onCreated: (clientId: string) => void;
};

export function NewClientModal({ open, onClose, onCreated }: Props) {
  const createMut = useCreateClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(""); setPhone(""); setEmail(""); setAddress(""); setNotes(""); setErr(null);
    }
  }, [open]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2) return setErr("Имя минимум 2 символа");
    if (phone.trim().length < 5) return setErr("Укажите телефон");

    createMut.mutate(
      {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (client) => {
          onCreated(client.id);
          onClose();
        },
        onError: (e: any) =>
          setErr(e?.response?.data?.error ?? "Не удалось создать клиента"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый клиент</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="nc-name">Имя *</Label>
            <Input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="nc-phone">Телефон *</Label>
            <Input id="nc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7..." />
          </div>
          <div>
            <Label htmlFor="nc-email">Email</Label>
            <Input id="nc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nc-addr">Адрес</Label>
            <Input id="nc-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nc-notes">Заметки</Label>
            <Textarea id="nc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
          </div>
          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={createMut.isPending}>Отмена</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Создаю…" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
