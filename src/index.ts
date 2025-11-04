// src/index.ts
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import puppeteer from "puppeteer";
import cron from "node-cron";
import path from "path";

import { MessageController } from "./controllers/MessageController";
import { MongoService } from "./services/MongoService";
import { logger } from "./utils/logger";
import { CommonService } from "./services/CommonService";
import { AdminService } from "./services/AdminService";
import { PartyInviteService } from "./services/PartyInviteService";
import { NODE_ENV, PING_SECRET, PING_URL } from "./config";
import { shouldProcessInDev } from "./utils/startHelpers";
import { sendPing } from "./utils/sendPing";

/**
 * Initializes and starts the bot
 */
async function startBot(): Promise<void> {
  let readyTimestamp = 0;
  let isConnected = false;

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.resolve(process.cwd(), ".wwebjs_auth"),
      clientId: "yasbot",
    }),
    puppeteer: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    },
  });

  const mongoService = new MongoService();
  await mongoService.connect();

  const commonService = new CommonService(mongoService, client);
  const amdinService = new AdminService(mongoService, client);
  const partyInviteService = new PartyInviteService(mongoService, client);

  const controller = new MessageController(
    commonService,
    amdinService,
    partyInviteService,
    mongoService
  );

  client.on("qr", (qr: string) => {
    qrcode.generate(qr, { small: true });
    logger.info("📸 Scan the QR code above to authenticate");
  });

  client.on("ready", async () => {
    readyTimestamp = Math.floor(Date.now() / 1000);
    logger.info("✔️  Yasbot is ready!");
    isConnected = true;

    await sendPing("yasbot", 1);

    if (NODE_ENV !== "development") {
      startCronJobs(mongoService, commonService, () => isConnected);
    }
  });

  client.on("disconnected", async () => {
    isConnected = false;
    logger.warn("⚠️ WhatsApp desconectado. Pings pausados até reconectar.");
  });

  client.on("auth_failure", (msg) => {
    logger.error("❌ Falha na autenticação:", msg);
    isConnected = false;
  });

  client.on("message", async (message: Message) => {
    try {
      const chat = await message.getChat();

      if (chat.isGroup && message.timestamp < readyTimestamp) {
        logger.info("Ignoring message from before bot was ready");
        return;
      }

      if (NODE_ENV === "development") {
        const ok = shouldProcessInDev(message, chat);
        if (!ok) {
          logger.silly(
            `⛔ [DEV] Ignorando mensagem de ${message.from} no chat ${chat.id._serialized}`
          );
          return;
        }
      }

      logger.silly(`📥 New message from ${message.from}`);
      await controller.handle(message);
    } catch (err) {
      logger.error("Error processing message:", err);
    }
  });

  await client.initialize();
}

startBot().catch((err) => {
  logger.error("Error starting Yasbot:", err);
  process.exit(1);
});

function startCronJobs(
  mongoService: MongoService,
  commonService: CommonService,
  isConnectedFn: () => boolean
) {
  // Schedule daily summary at 07:00 (America/Sao_Paulo)
  cron.schedule(
    "0 7 * * *",
    async () => {
      logger.info(
        "🔔 Running scheduled sendChatSummary for all registered groups"
      );

      try {
        const groupIds = await mongoService.getGroups();
        for (const groupId of groupIds) {
          await commonService.sendChatSummary(groupId);
        }
      } catch (err) {
        logger.warn("❌ Error in daily summary job:", err);
      }
    },
    {
      timezone: process.env.TIME_ZONE || "America/Sao_Paulo",
    }
  );

  // Schedule daily weather at 06:00 (America/Sao_Paulo)
  cron.schedule(
    "0 6 * * *",
    async () => {
      logger.info(
        "🔔 Running scheduled sendTodaysWeather for all registered groups"
      );

      try {
        const groupIds = await mongoService.getGroups();
        for (const groupId of groupIds) {
          await commonService.sendTodaysWeather(groupId);
        }
      } catch (err) {
        logger.warn("❌ Error in daily summary job:", err);
      }
    },
    {
      timezone: process.env.TIME_ZONE || "America/Sao_Paulo",
    }
  );

  // Schedule cleanup at 00:00 (America/Sao_Paulo)
  cron.schedule(
    "0 0 * * *",
    async () => {
      logger.info("🗑️ Running scheduled cleanup of old messages");
      try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        await mongoService.deleteMessagesOlderThan(twoDaysAgo);
      } catch (err) {
        logger.warn("❌ Error in cleanup job:", err);
      }
    },
    {
      timezone: process.env.TIME_ZONE || "America/Sao_Paulo",
    }
  );

  cron.schedule(
    "*/10 8-22 * * *",
    async () => {
      if (!isConnectedFn()) {
        logger.info("⏸️ WhatsApp offline — ping ignorado.");
        return;
      }

      logger.info("📡 Enviando ping periódico...");
      await sendPing("yasbot", 1);
    },
    { timezone: process.env.TIME_ZONE || "America/Sao_Paulo" }
  );
}
