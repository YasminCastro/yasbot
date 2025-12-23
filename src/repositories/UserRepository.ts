import { MongoClient, Collection, Filter, UpdateResult } from "mongodb";
import { logger } from "../utils/logger";
import { User } from "../models";

/**
 * Repository for user operations
 */
export class UserRepository {
  private client: MongoClient;
  private dbName: string;
  private users!: Collection<User>;

  constructor(client: MongoClient, dbName: string) {
    this.client = client;
    this.dbName = dbName;
  }

  /**
   * Initializes the users collection
   */
  public async initialize(): Promise<void> {
    const db = this.client.db(this.dbName);
    this.users = db.collection("users");

    // Create unique index on phoneNumber
    await this.users.createIndex(
      { phoneNumber: 1 },
      { unique: true, name: "unique_phoneNumber_idx" }
    );
  }

  /**
   * Adds a new user to the collection
   */
  public async addUser(
    name: string,
    phoneNumber: string,
    birthday?: Date
  ): Promise<boolean> {
    try {
      const response = await this.users.insertOne({
        name,
        phoneNumber,
        birthday,
      });

      return response.acknowledged;
    } catch (err: any) {
      if (err.code === 11000) {
        logger.warn(`⚠️ User with phone number ${phoneNumber} already exists`);
        return false;
      }
      logger.error("❌ Error adding user:", err);
      throw err;
    }
  }

  /**
   * Retrieves users from the collection
   */
  public async getUsers(filter: Filter<User> = {}): Promise<User[]> {
    try {
      const users = await this.users.find(filter).toArray();
      return users;
    } catch (err) {
      logger.error("❌ Error fetching users:", err);
      throw err;
    }
  }

  /**
   * Gets a user by phone number
   */
  public async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const user = await this.users.findOne({ phoneNumber });
      return user;
    } catch (err) {
      logger.error("❌ Error fetching user by phone number:", err);
      throw err;
    }
  }

  /**
   * Updates a user in the collection
   */
  public async updateUser(
    filter: Filter<User> = {},
    updateFields: Partial<User>
  ): Promise<boolean> {
    try {
      const result: UpdateResult = await this.users.updateOne(filter, {
        $set: updateFields,
      });
      return result.acknowledged && result.matchedCount > 0;
    } catch (err) {
      logger.error("❌ Error updating user:", err);
      throw err;
    }
  }

  /**
   * Removes a user from the collection
   */
  public async removeUser(filter: Filter<User> = {}): Promise<boolean> {
    try {
      const result = await this.users.deleteOne(filter);
      return result.deletedCount ? result.deletedCount > 0 : false;
    } catch (err) {
      logger.error("❌ Error removing user:", err);
      throw err;
    }
  }
}
