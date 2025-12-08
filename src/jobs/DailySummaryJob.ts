import { logger } from "../utils/logger";
import { SummaryService } from "../services/SummaryService";
import { Database } from "../repositories/Database";

/**
 * Job to send daily summary to all registered groups
 */
export class DailySummaryJob {
  constructor(
    private database: Database,
    private summaryService: SummaryService
  ) {}

  public async execute(): Promise<void> {
    logger.info(
      "🔔 Running scheduled sendChatSummary for all registered groups"
    );

    try {
      const groupIds = await this.database.groups.getGroups();
      for (const groupId of groupIds) {
        await this.summaryService.sendChatSummary(groupId);
      }
    } catch (err) {
      logger.warn("❌ Error in daily summary job:", err);
    }
  }
}
