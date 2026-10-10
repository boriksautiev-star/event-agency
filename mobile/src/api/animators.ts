import { api } from "./client";

export type AnimatorReportItem = {
  orderId: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  address: string | null;
  clientName: string | null;
  clientPhone: string | null;
  orderStatus: string;
  assignmentStatus: string;
  payout: number;
  payoutPaidAt: string | null;
  payoutMethod: string | null;
  slots: { characterName: string; durationMin: number }[];
};

export type AnimatorRelease = {
  assignmentId: string;
  orderId: string;
  orderTitle: string;
  eventDate: string;
  status: "declined" | "removed";
  releaseReason: string | null;
  releaseComment: string | null;
  releasedAt: string;
  payout: number;
};

export type AnimatorReport = {
  period: { from: string; to: string };
  scope: string;
  summary: {
    ordersCount: number;
    hours: number;
    payoutTotal: number;
    payoutPaid: number;
    payoutPaidCash: number;
    payoutPaidTransfer: number;
    payoutRemaining: number;
    acceptedCount: number;
    declinedCount: number;
    removedCount: number;
    offersCount: number;
    acceptRate: number;
    lostPayout: number;
    byReason: Record<string, number>;
  };
  releases: AnimatorRelease[];
  items: AnimatorReportItem[];
};

export async function fetchAnimatorReport(
  id: string,
  params: { from: string; to: string; scope?: "all" | "past" | "future" },
): Promise<AnimatorReport> {
  const q = new URLSearchParams();
  q.set("from", params.from);
  q.set("to", params.to);
  if (params.scope) q.set("scope", params.scope);
  const { data } = await api.get<AnimatorReport>(
    `/api/animators/${id}/report?${q.toString()}`,
  );
  return data;
}
