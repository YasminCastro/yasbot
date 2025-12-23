import { logger } from "../utils/logger";
import { Database } from "../repositories/Database";
import { MentionService } from "../services/MentionService";
import { GreetingService } from "../services/GreetingService";
import { WeatherService } from "../services/WeatherService";
import { MessageService } from "../services/MessageService";
import { SummaryService } from "../services/SummaryService";
import { AdminService } from "../services/AdminService";
// import { PartyInviteService } from "../services/PartyInviteService";
import { CommandHandler } from "../commands/CommandHandler";
import { WhatsAppClient } from "../bot/WhatsAppClient";
import {
  Scheduler,
  DailySummaryJob,
  DailyWeatherJob,
  CleanupJob,
  PingJob,
} from "../jobs";
import { NODE_ENV } from "../config";

/**
 * Initializes and starts the bot application
 */
async function startBot(): Promise<void> {
  const database = new Database();
  await database.connect();

  const whatsappClient = new WhatsAppClient({} as CommandHandler);

  const client = whatsappClient.getClient();

  // Initialize services
  const weatherService = new WeatherService(database, client);
  const greetingService = new GreetingService(weatherService);
  const mentionService = new MentionService(client);
  const messageService = new MessageService(database);
  const summaryService = new SummaryService(database, client);
  const adminService = new AdminService(database, client);
  // const partyInviteService = new PartyInviteService(database, client);

  const commandHandler = new CommandHandler(
    mentionService,
    greetingService,
    weatherService,
    messageService,
    adminService,
    // partyInviteService,
    database,
    client
  );

  whatsappClient.setCommandHandler(commandHandler);

  const dailySummaryJob = new DailySummaryJob(database, summaryService);
  const dailyWeatherJob = new DailyWeatherJob(database, weatherService);
  const cleanupJob = new CleanupJob(database);
  const pingJob = new PingJob();

  if (NODE_ENV !== "development") {
    const scheduler = new Scheduler(
      dailySummaryJob,
      dailyWeatherJob,
      cleanupJob,
      pingJob,
      () => whatsappClient.isClientConnected()
    );
    scheduler.start();
  }

  await whatsappClient.initialize();
}

startBot().catch((err) => {
  logger.error("Error starting Yasbot:", err);
  process.exit(1);
});
