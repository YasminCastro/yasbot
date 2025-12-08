import {
  MongoClient,
  Collection,
  DeleteResult,
  Filter,
  UpdateResult,
} from "mongodb";
import { logger } from "../utils/logger";
import { Guest } from "../models";

/**
 * Repository for guest operations
 */
export class GuestRepository {
  private client: MongoClient;
  private dbName: string;
  private guests!: Collection<Guest>;

  constructor(client: MongoClient, dbName: string) {
    this.client = client;
    this.dbName = dbName;
  }

  /**
   * Initializes the guests collection
   */
  public async initialize(): Promise<void> {
    const db = this.client.db(this.dbName);
    this.guests = db.collection("guests");

    // Create unique index on number
    await this.guests.createIndex(
      { number: 1 },
      { unique: true, name: "unique_number_idx" }
    );
  }

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
}
