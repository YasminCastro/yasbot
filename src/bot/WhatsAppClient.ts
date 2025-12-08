import { Client, LocalAuth, Message } from "whatsapp-web.js";
import puppeteer from "puppeteer";
import qrcode from "qrcode-terminal";
import path from "path";
import { logger } from "../utils/logger";
import { CommandHandler } from "../commands/CommandHandler";
import { shouldProcessInDev } from "../middlewares";
import { NODE_ENV } from "../config";
import { sendPing } from "../utils/sendPing";

/**
 * WhatsApp client wrapper
 */
export class WhatsAppClient {
  private client: Client;
  private commandHandler: CommandHandler | null = null;
  private readyTimestamp = 0;
  private isConnected = false;

  constructor(commandHandler: CommandHandler) {
    this.commandHandler = commandHandler;
    this.client = new Client({
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

    this.setupEventHandlers();
  }

  /**
   * Sets the command handler (used for dependency injection)
   */
  public setCommandHandler(commandHandler: CommandHandler): void {
    this.commandHandler = commandHandler;
  }

  /**
   * Sets up all event handlers for the WhatsApp client
   */
  private setupEventHandlers(): void {
    this.client.on("qr", (qr: string) => {
      qrcode.generate(qr, { small: true });
      logger.info("📸 Scan the QR code above to authenticate");
    });

    this.client.on("ready", async () => {
      this.readyTimestamp = Math.floor(Date.now() / 1000);
      logger.info("✔️  Yasbot is ready!");
      this.isConnected = true;
      await sendPing("yasbot", 1);
    });

    this.client.on("disconnected", async () => {
      this.isConnected = false;
      logger.warn("⚠️ WhatsApp desconectado. Pings pausados até reconectar.");
    });

    this.client.on("auth_failure", (msg) => {
      logger.error("❌ Falha na autenticação:", msg);
      this.isConnected = false;
    });

    this.client.on("message", async (message: Message) => {
      try {
        const chat = await message.getChat();

        if (chat.isGroup && message.timestamp < this.readyTimestamp) {
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
        if (this.commandHandler) {
          await this.commandHandler.handle(message);
        }
      } catch (err) {
        logger.error("Error processing message:", err);
      }
    });
  }

  /**
   * Initializes the WhatsApp client
   */
  public async initialize(): Promise<void> {
    await this.client.initialize();
  }

  /**
   * Gets the client instance
   */
  public getClient(): Client {
    return this.client;
  }

  /**
   * Checks if the client is connected
   */
  public isClientConnected(): boolean {
    return this.isConnected;
  }
}
