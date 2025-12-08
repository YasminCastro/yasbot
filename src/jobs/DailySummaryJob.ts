import { logger } from "../utils/logger";
import { CommonService } from "../services/CommonService";
import { Database } from "../repositories/Database";

/**
 * Job to send daily summary to all registered groups
 */
export class DailySummaryJob {
  constructor(
    private database: Database,
    private commonService: CommonService
  ) {}

  public async execute(): Promise<void> {
    logger.info(
      "🔔 Running scheduled sendChatSummary for all registered groups"
    );

    try {
      const groupIds = await this.database.groups.getGroups();
      for (const groupId of groupIds) {
        await this.commonService.sendChatSummary(groupId);
      }
    } catch (err) {
      logger.warn("❌ Error in daily summary job:", err);
    }
  }
}
