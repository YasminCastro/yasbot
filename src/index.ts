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
import { ADMIN_NUMBERS, NODE_ENV } from "./config";
import { shouldProcessInDev } from "./utils/startHelpers";

/**
 * Initializes and starts the bot
 */
async function startBot(): Promise<void> {
  let readyTimestamp = 0;

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // comment in local
        `--user-data-dir=${path.resolve(__dirname, ".wpp-session")}`, // comment in local
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

  client.on("ready", () => {
    readyTimestamp = Math.floor(Date.now() / 1000);
    logger.info("✔️  Yasbot is ready!");
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

  if (NODE_ENV !== "development") {
    startCronJobs(mongoService, commonService, client);
  }
}

startBot().catch((err) => {
  logger.error("Error starting Yasbot:", err);
  process.exit(1);
});

function startCronJobs(
  mongoService: MongoService,
  commonService: CommonService,
  client: Client
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
    "0 8-22 * * *",
    async () => {
      logger.info("📡 Enviando ping (ping) para admins...");

      try {
        for (const adminId of ADMIN_NUMBERS) {
          const chatId = `${adminId}@c.us`;
          await client.sendMessage(chatId, "ping");
        }
      } catch (err) {
        logger.warn("❌ Erro no job de ping para admins:", err);
      }
    },
    {
      timezone: process.env.TIME_ZONE || "America/Sao_Paulo",
    }
  );
}
