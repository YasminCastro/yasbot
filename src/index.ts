// src/index.ts
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import chalk from "chalk";

import { BotActions } from "./actions/BotActions";
import { GoogleSheetsService } from "./services/GoogleSheetsService";
import { SPREADSHEET_ID, GOOGLE_APPLICATION_CREDENTIALS } from "./config";
import { MessageController } from "./controllers/MessageController";

/**
 * Initializes and starts the bot
 */
async function startBot(): Promise<void> {
  // 1. Instantiate the WhatsApp client
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true },
  });

  // 2. Configure the Google Sheets service
  const sheetsService = new GoogleSheetsService({
    spreadsheetId: SPREADSHEET_ID,
    credentialsPath: GOOGLE_APPLICATION_CREDENTIALS,
  });

  // 3. Create BotActions and MessageController
  const actions = new BotActions(sheetsService);
  const controller = new MessageController(actions);

  // 4. Display QR code for login
  client.on("qr", (qr: string) => {
    qrcode.generate(qr, { small: true });
    console.log(
      chalk.bgBlueBright("📸 Scan the QR code above to authenticate")
    );
  });

  // 5. Bot is ready
  client.on("ready", () => {
    console.log(chalk.green("✔️  Yasbot is ready!"));
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
