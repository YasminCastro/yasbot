// src/utils/sendPing.ts
import { PING_URL, PING_SECRET } from "../config";
import { logger } from "./logger";

export async function sendPing(botId = "yasbot", status = 1) {
  if (!PING_URL || !PING_SECRET) {
    logger.warn("⚠️ Variáveis PING_URL ou PING_SECRET não configuradas");
    return;
  }

  try {
    const res = await fetch(PING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ping-secret": PING_SECRET,
      },
      body: JSON.stringify({ botId, status }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ping falhou: ${res.status} - ${text}`);
    }

    logger.info(`✅ Ping enviado (${status === 1 ? "online" : "offline"})`);
  } catch (err) {
    logger.warn("❌ Erro ao enviar ping:", err);
  }
}
