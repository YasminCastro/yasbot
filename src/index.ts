// src/index.ts
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import puppeteer from "puppeteer";

import { MessageController } from "./controllers/MessageController";
import { MongoService } from "./services/MongoService";
import { logger } from "./utils/logger";
import { CommonService } from "./services/CommonService";
import { AdminService } from "./services/AdminService";
import { PartyInviteService } from "./services/PartyInviteService";
import { startSchedulers } from "./schedulers";

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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
    partyInviteService
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
      if (message.timestamp < readyTimestamp) {
        logger.info("Ignoring message from before bot was ready");
        return;
      }
      await controller.handle(message);
    } catch (err) {
      logger.error("Error processing message:", err);
    }
  });

  await client.initialize();

  startSchedulers(mongoService, commonService);
}

startBot().catch((err) => {
  logger.error("Error starting Yasbot:", err);
  process.exit(1);
});
