// src/index.ts
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import puppeteer from "puppeteer";
import { format } from "date-fns";

import { BotActions } from "./actions/BotActions";
import { BIRTHDAY_COLLECTION, DB_NAME, MONGO_URI } from "./config";
import { MessageController } from "./controllers/MessageController";
import { BotBirthday } from "./actions/BotBirthday";
import { MongoService } from "./services/MongoService";

/**
 * Initializes and starts the bot
 */
async function startBot(): Promise<void> {
  // 1. Instantiate the WhatsApp client
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // 2. Configure t services
  const mongoService = new MongoService(
    MONGO_URI,
    DB_NAME,
    BIRTHDAY_COLLECTION
  );
  await mongoService.connect();

  // 3. Create BotActions and MessageController
  const actions = new BotActions();
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
}

startBot().catch((err) => {
  console.error(chalk.red("Error starting Yasbot:"), err);
  process.exit(1);
});
