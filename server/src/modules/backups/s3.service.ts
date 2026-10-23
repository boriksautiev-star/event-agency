import fs from "fs";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { prisma } from "../../db/prisma";
import { decrypt, encrypt, maskSecret } from "../../utils/crypto";

export type S3Target = {
  id: string;
  name: string;
  enabled: boolean;
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  pathPrefix: string;
  retentionDays: number;
};

export type UploadResult = {
  targetId: string;
  name: string;
  status: "success" | "failed";
  url: string | null;
  error: string | null;
};

export class S3Service {
  /** Читает таргеты из AgencySettings, расшифровывает secretKey. */
  static async getTargets(): Promise<S3Target[]> {
    const settings = await prisma.agencySettings.findFirst();
    if (!settings?.s3Targets) return [];
    const raw: any = settings.s3Targets;
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      id: t.id,
      name: t.name,
      enabled: !!t.enabled,
      endpoint: t.endpoint || "",
      region: t.region || "us-east-1",
      bucket: t.bucket || "",
      accessKey: t.accessKey || "",
      secretKey: t.secretKey ? decrypt(t.secretKey) : "",
      pathPrefix: t.pathPrefix || "",
      retentionDays: t.retentionDays ?? 90,
    }));
  }

  static createClient(target: S3Target): S3Client {
    const config: any = {
      region: target.region,
      credentials: {
        accessKeyId: target.accessKey,
        secretAccessKey: target.secretKey,
      },
    };
    if (target.endpoint) {
      config.endpoint = target.endpoint;
      config.forcePathStyle = true;
    }
    return new S3Client(config);
  }

  static async uploadFile(
    target: S3Target,
    filePath: string,
    fileName: string,
  ): Promise<UploadResult> {
    try {
      const client = this.createClient(target);
      const key = (target.pathPrefix || "") + fileName;
      const body = fs.createReadStream(filePath);
      await client.send(
        new PutObjectCommand({
          Bucket: target.bucket,
          Key: key,
          Body: body,
        }),
      );
      return {
        targetId: target.id,
        name: target.name,
        status: "success",
        url: "s3://" + target.bucket + "/" + key,
        error: null,
      };
    } catch (e: any) {
      return {
        targetId: target.id,
        name: target.name,
        status: "failed",
        url: null,
        error: e?.message || String(e),
      };
    }
  }

  /** Тестовое подключение: загружает 4 байта, удаляет. */
  static async testTarget(target: S3Target): Promise<{ ok: boolean; error?: string }> {
    try {
      const client = this.createClient(target);
      const testKey = (target.pathPrefix || "") + ".test-" + Date.now() + ".txt";
      await client.send(
        new PutObjectCommand({
          Bucket: target.bucket,
          Key: testKey,
          Body: "test",
        }),
      );
      await client.send(
        new DeleteObjectCommand({
          Bucket: target.bucket,
          Key: testKey,
        }),
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  static async uploadToAllTargets(
    filePath: string,
    fileName: string,
  ): Promise<UploadResult[]> {
    const targets = await this.getTargets();
    const enabled = targets.filter((t) => t.enabled);
    if (enabled.length === 0) return [];
    return Promise.all(enabled.map((t) => this.uploadFile(t, filePath, fileName)));
  }
  /** Возвращает таргеты без секретов (для UI). */
  static async listMasked(): Promise<any[]> {
    const targets = await this.getTargets();
    return targets.map((t) => ({
      id: t.id,
      name: t.name,
      enabled: t.enabled,
      endpoint: t.endpoint,
      region: t.region,
      bucket: t.bucket,
      accessKey: t.accessKey ? maskSecret(t.accessKey) : "",
      secretKeyMasked: t.secretKey ? maskSecret(t.secretKey) : "",
      pathPrefix: t.pathPrefix,
      retentionDays: t.retentionDays,
    }));
  }

  /** Сохраняет новый таргет. */
  static async addTarget(input: any) {
    const settings = await prisma.agencySettings.findFirst();
    if (!settings) throw new Error("AgencySettings not found");
    const current: any[] = Array.isArray(settings.s3Targets) ? (settings.s3Targets as any[]) : [];
    const id = require("crypto").randomUUID();
    const target = {
      id,
      name: input.name,
      enabled: input.enabled !== false,
      endpoint: input.endpoint || "",
      region: input.region || "us-east-1",
      bucket: input.bucket,
      accessKey: input.accessKey,
      secretKey: input.secretKey ? encrypt(input.secretKey) : "",
      pathPrefix: input.pathPrefix || "",
      retentionDays: input.retentionDays ?? 90,
    };
    await prisma.agencySettings.update({
      where: { id: settings.id },
      data: { s3Targets: [...current, target] as any },
    });
    return { id };
  }

  /** Обновляет существующий таргет. */
  static async updateTarget(id: string, input: any) {
    const settings = await prisma.agencySettings.findFirst();
    if (!settings) throw new Error("AgencySettings not found");
    const current: any[] = Array.isArray(settings.s3Targets) ? (settings.s3Targets as any[]) : [];
    const idx = current.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Target not found");
    const old = current[idx];
    const updated = {
      ...old,
      name: input.name ?? old.name,
      enabled: input.enabled ?? old.enabled,
      endpoint: input.endpoint ?? old.endpoint,
      region: input.region ?? old.region,
      bucket: input.bucket ?? old.bucket,
      accessKey: input.accessKey ?? old.accessKey,
      pathPrefix: input.pathPrefix ?? old.pathPrefix,
      retentionDays: input.retentionDays ?? old.retentionDays,
      secretKey: input.secretKey ? encrypt(input.secretKey) : old.secretKey,
    };
    const next = [...current];
    next[idx] = updated;
    await prisma.agencySettings.update({
      where: { id: settings.id },
      data: { s3Targets: next as any },
    });
    return { ok: true };
  }

  /** Удаляет таргет. */
  static async deleteTarget(id: string) {
    const settings = await prisma.agencySettings.findFirst();
    if (!settings) throw new Error("AgencySettings not found");
    const current: any[] = Array.isArray(settings.s3Targets) ? (settings.s3Targets as any[]) : [];
    const next = current.filter((t) => t.id !== id);
    await prisma.agencySettings.update({
      where: { id: settings.id },
      data: { s3Targets: next as any },
    });
    return { ok: true };
  }

  /** Тест неподтверждённого таргета (из формы). */
  static async testUncommitted(input: any): Promise<{ ok: boolean; error?: string }> {
    const target: S3Target = {
      id: "temp",
      name: input.name || "temp",
      enabled: true,
      endpoint: input.endpoint || "",
      region: input.region || "us-east-1",
      bucket: input.bucket,
      accessKey: input.accessKey,
      secretKey: input.secretKey,
      pathPrefix: input.pathPrefix || "",
      retentionDays: 1,
    };
    return this.testTarget(target);
  }

  /** Тест сохранённого таргета. */
  static async testSaved(id: string): Promise<{ ok: boolean; error?: string }> {
    const targets = await this.getTargets();
    const target = targets.find((t) => t.id === id);
    if (!target) return { ok: false, error: "Target not found" };
    return this.testTarget(target);
  }
}
