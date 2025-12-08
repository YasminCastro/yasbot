import { logger } from "../utils/logger";
import { CommonService } from "../services/CommonService";
import { Database } from "../repositories/Database";

/**
 * Job to send daily weather to all registered groups
 */
export class DailyWeatherJob {
  constructor(
    private database: Database,
    private commonService: CommonService
  ) {}

  public async execute(): Promise<void> {
    logger.info(
      "🔔 Running scheduled sendTodaysWeather for all registered groups"
    );

    try {
      const groupIds = await this.database.groups.getGroups();
      for (const groupId of groupIds) {
        await this.commonService.sendTodaysWeather(groupId);
      }
    } catch (err) {
      logger.warn("❌ Error in daily weather job:", err);
    }
  }
}
