import { api } from "./client";

export type HandoverStatus =
  | "pending_receiver"
  | "pending_approval"
  | "approved"
  | "rejected_by_receiver"
  | "rejected_by_admin"
  | "cancelled";

export type HandoverRequest = {
  id: string;
  orderId: string;
  slotId: string;
  fromAnimatorId: string;
  toAnimatorId: string;
  comment: string | null;
  status: HandoverStatus;
  requestedAt: string;
  acceptedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  rejectComment: string | null;
  order: {
    id: string;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    address?: string | null;
  };
  slot?: {
    id: string;
    rateDurationMinutes: number;
    character?: { id: string; name: string } | null;
    characterNameSnapshot?: string;
  };
  fromAnimator: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  toAnimator: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
};

export type HandoverCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  payout: number;
};

export async function fetchHandoverCandidates(
  orderId: string,
  slotId: string,
): Promise<HandoverCandidate[]> {
  const { data } = await api.get<{ items: HandoverCandidate[] }>(
    `/api/orders/${orderId}/slots/${slotId}/handover-candidates`,
  );
  return data.items ?? [];
}

export async function createHandover(
  orderId: string,
  slotId: string,
  input: { toAnimatorId: string; comment?: string | null },
): Promise<HandoverRequest> {
  const { data } = await api.post<HandoverRequest>(
    `/api/orders/${orderId}/slots/${slotId}/handover`,
    input,
  );
  return data;
}

export async function fetchMyOutgoing(): Promise<HandoverRequest[]> {
  const { data } = await api.get<{ items: HandoverRequest[] }>(
    "/api/handover/my-outgoing?status=all",
  );
  return data.items ?? [];
}

export async function fetchMyIncoming(): Promise<HandoverRequest[]> {
  const { data } = await api.get<{ items: HandoverRequest[] }>(
    "/api/handover/my-incoming?status=all",
  );
  return data.items ?? [];
}

export async function fetchHandover(id: string): Promise<HandoverRequest> {
  const { data } = await api.get<HandoverRequest>(`/api/handover/${id}`);
  return data;
}

export async function acceptHandover(id: string): Promise<void> {
  await api.post(`/api/handover/${id}/accept`);
}

export async function declineHandover(id: string, rejectComment?: string | null): Promise<void> {
  await api.post(`/api/handover/${id}/decline`, { rejectComment: rejectComment ?? null });
}

export async function cancelHandover(id: string): Promise<void> {
  await api.delete(`/api/handover/${id}`);
}
