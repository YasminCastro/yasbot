// src/index.ts
import { Client, LocalAuth, Message, RemoteAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import puppeteer from "puppeteer";
import { format } from "date-fns";
import cron from "node-cron";

import { BotActions } from "./actions/BotActions";
import { DB_NAME, MONGO_URI } from "./config";
import { MessageController } from "./controllers/MessageController";
import { BotBirthday } from "./actions/BotBirthday";
import { MongoService } from "./services/MongoService";

import mongoose from "mongoose";
import { MongoStore } from "wwebjs-mongo";

/**
 * Initializes and starts the bot
 */
async function startBot(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  const store = new MongoStore({ mongoose: mongoose });

  // 1. Instantiate the WhatsApp client
  const client = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300_000,
    }),
    puppeteer: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // 2. Configure t services
  const guestCollection = "guests";
  const msgCollection = "messages";
  const groupsCollection = "groups";
  const mongoService = new MongoService(
    MONGO_URI,
    DB_NAME,
    guestCollection,
    msgCollection,
    groupsCollection
  );
  await mongoService.connect();

  // 3. Create BotActions and MessageController
  const actions = new BotActions(mongoService, client);
  const birthday = new BotBirthday(mongoService, client);

  const controller = new MessageController(actions, birthday);

  // 4. Display QR code for login
  client.on("qr", (qr: string) => {
    qrcode.generate(qr, { small: true });
    console.log(
      chalk.bgBlueBright("📸 Scan the QR code above to authenticate")
    );
  });

  // 5. Bot is ready
  client.on("ready", () => {
    console.log(
      chalk.green(`✔️  Yasbot is ready! ${format(new Date(), "HH:mm:ss")}`)
    );
  });

  // 6. Route incoming messages to the controller
  client.on("message", async (message: Message) => {
    try {
      await controller.handle(message);
    } catch (err) {
      console.error(chalk.red("Error processing message:"), err);
    }
  });

  // 7. Initialize the connection
  await client.initialize();

  // 8) Schedule daily summary at 23:59 (America/Sao_Paulo)
  cron.schedule(
    "59 23 * * *",
    async () => {
      console.log(
        chalk.magenta(
          "🔔 Running scheduled sendChatSummary for all registered groups"
        )
      );
      try {
        // fetch all registered group IDs
        const groupIds = await mongoService.getGroups();
        for (const groupId of groupIds) {
          await actions.sendChatSummary(groupId);
        }
      } catch (err) {
        console.error(chalk.red("❌ Error in daily summary job:"), err);
      }
    },
    {
      timezone: process.env.TIME_ZONE || "America/Sao_Paulo",
    }
  );

  // 9) Schedule cleanup at 00:00 (America/Sao_Paulo)
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log(chalk.yellow("🗑️ Running scheduled cleanup of old messages"));
      try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        await mongoService.deleteMessagesOlderThan(twoDaysAgo);
      } catch (err) {
        console.error(chalk.red("❌ Error in cleanup job:"), err);
      }
    },
    {
      timezone: process.env.TIME_ZONE || "America/Sao_Paulo",
    }
  );
}

startBot().catch((err) => {
  console.error(chalk.red("Error starting Yasbot:"), err);
  process.exit(1);
});
