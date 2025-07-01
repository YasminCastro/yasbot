import cron from "node-cron";
import { CommonService } from "../services/CommonService";
import { MongoService } from "../services/MongoService";
import { Logger } from "winston";

export function scheduleDailySummary(
  mongoService: MongoService,
  commonService: CommonService,
  logger: Logger
) {
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
    { timezone: process.env.TIME_ZONE || "America/Sao_Paulo" }
  );
}

export function scheduleCleanup(mongoService: MongoService, logger: Logger) {
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
    { timezone: process.env.TIME_ZONE || "America/Sao_Paulo" }
  );
}
