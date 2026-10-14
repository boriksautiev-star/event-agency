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

type ListResp<T> = { items?: T[]; total?: number };

export async function fetchPendingApproval(): Promise<HandoverRequest[]> {
  const { data } = await api.get<ListResp<HandoverRequest>>(
    "/handover/pending-approval",
  );
  return data.items ?? [];
}

export type HandoverStatusGroup =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "all";

export type HandoverHistoryQuery = {
  statusGroup?: HandoverStatusGroup;
  animatorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function fetchHistory(
  q: HandoverHistoryQuery,
): Promise<HandoverRequest[]> {
  const params = new URLSearchParams();
  if (q.statusGroup) params.set("statusGroup", q.statusGroup);
  if (q.animatorId) params.set("animatorId", q.animatorId);
  if (q.from) params.set("from", q.from);
  if (q.to) params.set("to", q.to);
  if (q.limit) params.set("limit", String(q.limit));
  if (q.offset) params.set("offset", String(q.offset));
  const { data } = await api.get<ListResp<HandoverRequest>>(
    `/handover/history?${params.toString()}`,
  );
  return data.items ?? [];
}

export async function fetchHandoverById(id: string): Promise<HandoverRequest> {
  const { data } = await api.get<HandoverRequest>(`/handover/${id}`);
  return data;
}

export async function approveHandover(id: string): Promise<void> {
  await api.post(`/handover/${id}/approve`, {});
}

export async function rejectHandover(
  id: string,
  rejectComment: string | null,
): Promise<void> {
  await api.post(`/handover/${id}/reject`, { rejectComment });
}
