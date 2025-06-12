// src/index.ts
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import puppeteer from "puppeteer";
import cron from "node-cron";

import { MessageController } from "./controllers/MessageController";
import { MongoService } from "./services/MongoService";
import { logger } from "./utils/logger";
import { CommonService } from "./services/CommonService";
import { AdminService } from "./services/AdminService";
import { BirthdayService } from "./services/BirthdayService";

/**
 * Initializes and starts the bot
 */
async function startBot(): Promise<void> {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  const mongoService = new MongoService();
  await mongoService.connect();

  const commonService = new CommonService(mongoService, client);
  const amdinService = new AdminService(mongoService, client);
  const birthdayService = new BirthdayService(mongoService, client);

  const controller = new MessageController(
    commonService,
    amdinService,
    birthdayService
  );

  client.on("qr", (qr: string) => {
    qrcode.generate(qr, { small: true });
    logger.info("📸 Scan the QR code above to authenticate");
  });

  client.on("ready", () => {
    logger.info("✔️  Yasbot is ready!");
  });

  client.on("message", async (message: Message) => {
    try {
      await controller.handle(message);
    } catch (err) {
      logger.error("Error processing message:", err);
    }
  });

  await client.initialize();

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
}

startBot().catch((err) => {
  logger.error("Error starting Yasbot:", err);
  process.exit(1);
});
