import cron from "node-cron";
import { logger } from "../utils/logger";
import { DailySummaryJob } from "./DailySummaryJob";
import { DailyWeatherJob } from "./DailyWeatherJob";
import { CleanupJob } from "./CleanupJob";
import { PingJob } from "./PingJob";

/**
 * Scheduler for all cron jobs
 */
export class Scheduler {
  private dailySummaryJob: DailySummaryJob;
  private dailyWeatherJob: DailyWeatherJob;
  private cleanupJob: CleanupJob;
  private pingJob: PingJob;
  private isConnectedFn: () => boolean;

  constructor(
    dailySummaryJob: DailySummaryJob,
    dailyWeatherJob: DailyWeatherJob,
    cleanupJob: CleanupJob,
    pingJob: PingJob,
    isConnectedFn: () => boolean
  ) {
    this.dailySummaryJob = dailySummaryJob;
    this.dailyWeatherJob = dailyWeatherJob;
    this.cleanupJob = cleanupJob;
    this.pingJob = pingJob;
    this.isConnectedFn = isConnectedFn;
  }

  /**
   * Starts all scheduled jobs
   */
  public start(): void {
    const timezone = process.env.TIME_ZONE || "America/Sao_Paulo";

    // Schedule daily summary at 07:00
    cron.schedule(
      "0 7 * * *",
      () => this.dailySummaryJob.execute(),
      { timezone }
    );

    // Schedule daily weather at 06:00
    cron.schedule(
      "0 6 * * *",
      () => this.dailyWeatherJob.execute(),
      { timezone }
    );

    // Schedule cleanup at 00:00
    cron.schedule(
      "0 0 * * *",
      () => this.cleanupJob.execute(),
      { timezone }
    );

    // Schedule ping every 10 minutes
    cron.schedule(
      "*/10 * * * *",
      () => {
        if (!this.isConnectedFn()) return;
        this.pingJob.execute();
      },
      { timezone }
    );

    logger.info("✅ Scheduler started with all jobs");
  }
}

