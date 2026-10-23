import fs from "fs";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { prisma } from "../../db/prisma";
import { decrypt } from "../../utils/crypto";

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
}
