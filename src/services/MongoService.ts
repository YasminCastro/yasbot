// src/services/MongoService.ts
import {
  MongoClient,
  Collection,
  DeleteResult,
  Filter,
  UpdateResult,
} from "mongodb";
import { logger } from "../utils/logger";
import { Group, GroupDailySummary, Guest, LoggedMessage } from "../interfaces";
import { DB_NAME, MONGO_URI } from "../config";

/**
 * Service to manage MongoDB connection and guest operations
 */
export class MongoService {
  private client: MongoClient;
  private dbName: string;
  private guests!: Collection<Guest>;
  private groups!: Collection<Group>;
  private messages!: Collection<LoggedMessage>;
  private groupDailySummary!: Collection<GroupDailySummary>;

  /**
   * Initializes the MongoService with the given connection parameters
   */
  constructor() {
    this.client = new MongoClient(MONGO_URI);
    this.dbName = DB_NAME;
  }

  /**
   * Connects to the MongoDB server and initializes the guests collection
   */
  public async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.guests = db.collection("guests");
    this.messages = db.collection("messages");
    this.groups = db.collection("groups");
    this.groupDailySummary = db.collection("groupsDailySummary");

    // índices
    await this.guests.createIndex(
      { number: 1 },
      { unique: true, name: "unique_number_idx" }
    );
    await this.messages.createIndex({ timestamp: -1 });
    await this.groups.createIndex({ groupId: 1 }, { unique: true });
    await this.groupDailySummary.createIndex({ timestamp: -1 });

    logger.info("✅ MongoDB connected.");
  }

  // #region Guest Operations

  /**
   * Adds a new guest to the collection
   */
  public async addGuest(
    name: string,
    number: string,
    sendInvitation: boolean
  ): Promise<boolean> {
    const response = await this.guests.insertOne({
      name,
      number,
      addedAt: new Date(),
      receivedInvitation: false,
      sendInvitation,
    });

    return response.acknowledged;
  }

  /**
   * Removes a guest from the collection by their phone number.
   */
  public async removeGuest(filter: Filter<Guest> = {}): Promise<boolean> {
    try {
      const result: DeleteResult = await this.guests.deleteOne(filter);
      if (result.deletedCount && result.deletedCount > 0) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      logger.error("❌ Error removing guest:", err);
      throw err;
    }
  }

  /**
   * Update a guest from the collection by their name.
   */
  public async updateGuest(
    filter: Filter<Guest> = {},
    updateFields: Partial<Guest>
  ): Promise<boolean> {
    try {
      const result: UpdateResult = await this.guests.updateOne(filter, {
        $set: updateFields,
      });
      return result.acknowledged && result.matchedCount > 0;
    } catch (err) {
      logger.error("❌ Error updating guest:", err);
      throw err;
    }
  }

  /**
   * Retrieves all guests from the collection.
   */
  public async getGuests(filter: Filter<Guest> = {}): Promise<Guest[]> {
    try {
      const guests = await this.guests.find(filter).toArray();
      return guests;
    } catch (err) {
      logger.error("❌ Error fetching guests:", err);
      throw err;
    }
  }

  /**
   * Marks a guest as having received an invitation.
   */
  public async markInvited(number: string): Promise<void> {
    await this.guests.updateOne(
      { number },
      { $set: { receivedInvitation: true, invitedAt: new Date() } }
    );
  }

  /**
   * Marks a guest as confirmed based on their phone number
   */
  public async changeGuestConfirmStatus(
    number: string,
    confirmed: boolean
  ): Promise<void> {
    await this.guests.updateOne(
      { number },
      { $set: { confirmed, confirmedAt: new Date() } }
    );
  }

  // #endregion

  // #region Groups Operations

  /**
   * Adds a group to the list of those receiving the daily summary.
   *
   */
  public async addGroup(
    groupId: string
  ): Promise<{ acknowledged: boolean; message: string }> {
    try {
      const res = await this.groups.insertOne({ groupId });
      return {
        acknowledged: res.acknowledged,
        message: "Grupo adicionado com sucesso",
      };
    } catch (err: any) {
      if (err.code === 11000) {
        return {
          acknowledged: false,
          message: "Grupo já foi adicionado anteriormente",
        };
      }
      logger.error("❌ Error registering group:", err);
      return {
        acknowledged: false,
        message: "Erro ao registrar grupo",
      };
    }
  }

  /**
   * Remove a group to the list of those receiving the daily summary.
   *
   */
  public async removeGroup(
    groupId: string
  ): Promise<{ acknowledged: boolean; message: string }> {
    try {
      const res = await this.groups.deleteOne({ groupId });
      return {
        acknowledged: res.acknowledged,
        message: "Grupo removido com sucesso",
      };
    } catch (err: any) {
      logger.error("❌ Error remove group:", err);
      return {
        acknowledged: false,
        message: "Erro ao remover grupo",
      };
    }
  }

  /**
   * Retrieves all groupIds registered for daily summary.
   */

  public async getGroups(filter: Filter<Group> = {}): Promise<string[]> {
    const groups = await this.groups.find(filter).toArray();
    return groups.map((d) => d.groupId);
  }

  /**
   * Save the daily summary for all groups.
   */

  public async saveGroupDailySummary(
    groupId: string,
    top3Lines: string[],
    totalMessages: number,
    timestamp: Date
  ): Promise<boolean> {
    try {
      const res = await this.groupDailySummary.insertOne({
        groupId,
        timestamp,
        top3Lines,
        totalMessages,
      });
      return res.acknowledged;
    } catch (err: any) {
      logger.error("❌ Error saving group daily summary:", err);
      return false;
    }
  }

  // #endregion

  // #region Messages Operations
  /**
   *  Adds a message to the messages collection.
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
      logger.error("❌ Error registering group:", err);
      return false;
    }
  }

  /**
   *  Adds a message to the messages collection.
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
   *
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

  // #endregion
}
