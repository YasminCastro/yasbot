import { MongoClient, Collection, Filter } from "mongodb";
import { logger } from "../utils/logger";
import { LoggedMessage } from "../models";

/**
 * Repository for message operations
 */
export class MessageRepository {
  private client: MongoClient;
  private dbName: string;
  private messages!: Collection<LoggedMessage>;

  constructor(client: MongoClient, dbName: string) {
    this.client = client;
    this.dbName = dbName;
  }

  /**
   * Initializes the messages collection
   */
  public async initialize(): Promise<void> {
    const db = this.client.db(this.dbName);
    this.messages = db.collection("messages");

    // Create index on timestamp
    await this.messages.createIndex({ timestamp: -1 });
  }

  /**
   * Adds a message to the messages collection.
   */
  public async addMessage(
    groupId: string,
    message: string,
    senderPhone: string,
    senderWid: string
  ): Promise<boolean> {
    try {
      const res = await this.messages.insertOne({
        groupId,
        message,
        timestamp: new Date(),
        senderPhone,
        senderWid,
      });
      return res.acknowledged;
    } catch (err: any) {
      logger.error("❌ Error registering message:", err);
      return false;
    }
  }

  /**
   * Retrieves messages from the collection.
   */
  public async getMessages(
    filter: Filter<LoggedMessage> = {}
  ): Promise<LoggedMessage[]> {
    try {
      const messages = await this.messages.find(filter).toArray();
      return messages;
    } catch (err: any) {
      logger.error("❌ Error fetching messages:", err);
      throw err;
    }
  }

  /**
   * Deletes all messages older than the given Date.
   */
  public async deleteMessagesOlderThan(cutoffDate: Date): Promise<number> {
    try {
      const result = await this.messages.deleteMany({
        timestamp: { $lt: cutoffDate },
      });
      logger.info(
        `🗑️ Deleted ${
          result.deletedCount
        } messages older than ${cutoffDate.toISOString()}`
      );

      return result.deletedCount ?? 0;
    } catch (err) {
      logger.error("❌ Error deleting old messages:", err);
      throw err;
    }
  }
}
