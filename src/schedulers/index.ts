import { MongoService } from "../services/MongoService";
import { CommonService } from "../services/CommonService";
import { scheduleCleanup, scheduleDailySummary } from "./dailySummary";
import { logger } from "../utils/logger";

export function startSchedulers(
  mongoService: MongoService,
  commonService: CommonService
) {
  scheduleDailySummary(mongoService, commonService, logger);
  scheduleCleanup(mongoService, logger);
}
