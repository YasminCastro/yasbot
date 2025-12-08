import { logger } from "../utils/logger";
import { WeatherService } from "../services/WeatherService";
import { Database } from "../repositories/Database";

/**
 * Job to send daily weather to all registered groups
 */
export class DailyWeatherJob {
  constructor(
    private database: Database,
    private weatherService: WeatherService
  ) {}

  public async execute(): Promise<void> {
    logger.info(
      "🔔 Running scheduled sendTodaysWeather for all registered groups"
    );

    try {
      const groupIds = await this.database.groups.getGroups();
      for (const groupId of groupIds) {
        await this.weatherService.sendTodaysWeather(groupId);
      }
    } catch (err) {
      logger.warn("❌ Error in daily weather job:", err);
    }
  }
}
