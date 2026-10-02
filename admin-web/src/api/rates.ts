import { api } from "./client";

export type RateCell = {
  rateGroupId: string;
  durationMin: number;
  amount: number;
};

export type RateMatrix = {
  animatorId: string;
  cells: RateCell[];
};

export type SaveMatrixCell = {
  rateGroupId: string;
  durationMin: number;
  amount: number | null;
};

export type SaveMatrixInput = {
  animatorId: string;
  cells: SaveMatrixCell[];
};

export type SaveMatrixResult = {
  ok: boolean;
  affectedAssignments: number;
};

export async function fetchMatrix(animatorId: string): Promise<RateMatrix> {
  const { data } = await api.get<RateMatrix>(`/rates/matrix?animatorId=${animatorId}`);
  return data;
}

export async function saveMatrix(input: SaveMatrixInput): Promise<SaveMatrixResult> {
  const { data } = await api.put<SaveMatrixResult>("/rates/matrix", input);
  return data;
}
