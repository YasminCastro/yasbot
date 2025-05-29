// src/index.ts
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

import { BotActions } from "./actions/BotActions";
import { GoogleSheetsService } from "./services/GoogleSheetsService";
import { SPREADSHEET_ID, GOOGLE_APPLICATION_CREDENTIALS } from "./config";
import { MessageController } from "./controllers/MessageController";
import chalk from "chalk";

/**
 * Inicializa e inicia o bot
 */
async function startBot(): Promise<void> {
  // 1. Instancia o client do WhatsApp
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true },
  });

  // 2. Configura o serviço do Google Sheets
  const sheetsService = new GoogleSheetsService({
    spreadsheetId: SPREADSHEET_ID,
    credentialsPath: GOOGLE_APPLICATION_CREDENTIALS,
  });

  // 3. Cria BotActions e MessageController
  const actions = new BotActions(client, sheetsService);
  const controller = new MessageController(actions);

  // 4. QR code para login
  client.on("qr", (qr: string) => {
    qrcode.generate(qr, { small: true });
    console.log(chalk.bgBlueBright("📸 Scan qr code above"));
  });

  // 5. Bot pronto
  client.on("ready", () => {
    console.log(chalk.green("✔️  Yasbot ready!"));
  });

  // 6. Roteamento de mensagens ao controller
  client.on("message", async (message: Message) => {
    try {
      await controller.handle(message);
    } catch (err) {
      console.error(chalk.red("Error to process message:"), err);
    }
  });

  // 7. Inicializa a conexão
  await client.initialize();
}

startBot().catch((err) => {
  console.error(chalk.red("Error to start Yasbot:"), err);
  process.exit(1);
});
