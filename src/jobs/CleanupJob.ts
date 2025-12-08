import { logger } from "../utils/logger";
import { Database } from "../repositories/Database";

/**
 * Job to cleanup old messages from database
 */
export class CleanupJob {
  constructor(private database: Database) {}

  public async execute(): Promise<void> {
    logger.info("🗑️ Running scheduled cleanup of old messages");
    try {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await this.database.messages.deleteMessagesOlderThan(twoDaysAgo);
    } catch (err) {
      logger.warn("❌ Error in cleanup job:", err);
    }
  }
}
