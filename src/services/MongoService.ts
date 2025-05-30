// src/services/MongoService.ts
import chalk from "chalk";
import { MongoClient, Collection, DeleteResult, Filter } from "mongodb";

export interface Guest {
  _id?: string;
  name: string;
  number: string;
  addedAt: Date;
  receivedInvitation?: boolean;
  confirmed?: boolean;
  confirmedAt?: Date;
  invitedAt?: Date;
}

/**
 * Service to manage MongoDB connection and guest operations
 */
export class MongoService {
  private client: MongoClient;
  private guests!: Collection<Guest>;

  /**
   * Initializes the MongoService with the given connection parameters
   */
  constructor(
    private uri: string,
    private dbName: string,
    private collectionName: string
  ) {
    // Create a new MongoClient instance
    this.client = new MongoClient(this.uri);
  }

  /**
   * Connects to the MongoDB server and initializes the guests collection
   */
  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.guests = this.client
        .db(this.dbName)
        .collection<Guest>(this.collectionName);

      await this.guests.createIndex(
        { number: 1 },
        { unique: true, name: "unique_number_idx" }
      );
      console.log(chalk.cyan("Successfully connected to MongoDB!"));
    } catch (error) {
      console.error(chalk.red("Error connecting to MongoDB:"), error);
      throw error;
    }
  }

  /**
   * Adds a new guest to the collection
   */
  public async addGuest(name: string, number: string): Promise<boolean> {
    const response = await this.guests.insertOne({
      name,
      number,
      addedAt: new Date(),
      receivedInvitation: false,
    });

    return response.acknowledged;
  }

  /**
   * Removes a guest from the collection by their phone number.
   */
  public async removeGuest(number: string): Promise<boolean> {
    try {
      const result: DeleteResult = await this.guests.deleteOne({ number });
      if (result.deletedCount && result.deletedCount > 0) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error(chalk.red("❌ Error removing guest:"), err);
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
      console.error(chalk.red("❌ Error fetching guests:"), err);
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
