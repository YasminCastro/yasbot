import { logger } from "../utils/logger";
import { Database } from "../repositories/Database";
import { CommonService } from "../services/CommonService";
import { AdminService } from "../services/AdminService";
import { PartyInviteService } from "../services/PartyInviteService";
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
  // Initialize database
  const database = new Database();
  await database.connect();

  // Create WhatsApp client first (it will create the internal Client)
  const whatsappClient = new WhatsAppClient(
    database,
    {} as CommonService,
    {} as CommandHandler
  );

  // Get the client instance to use in services
  const client = whatsappClient.getClient();

  // Initialize services with the client
  const commonService = new CommonService(database, client);
  const adminService = new AdminService(database, client);
  const partyInviteService = new PartyInviteService(database, client);

  // Initialize command handler
  const commandHandler = new CommandHandler(
    commonService,
    adminService,
    partyInviteService,
    database
  );

  // Set the command handler in WhatsApp client
  whatsappClient.setCommandHandler(commandHandler);

  // Initialize jobs
  const dailySummaryJob = new DailySummaryJob(database, commonService);
  const dailyWeatherJob = new DailyWeatherJob(database, commonService);
  const cleanupJob = new CleanupJob(database);
  const pingJob = new PingJob();

  // Start scheduler if not in development
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

  // Initialize WhatsApp client
  await whatsappClient.initialize();
}

startBot().catch((err) => {
  logger.error("Error starting Yasbot:", err);
  process.exit(1);
});
