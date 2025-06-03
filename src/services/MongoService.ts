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

export interface LoggedMessage {
  _id?: string;
  message: string;
  sender: string;
  timestamp: Date;
  groupId?: string;
}

export interface Group {
  groupId: string;
}

/**
 * Service to manage MongoDB connection and guest operations
 */
export class MongoService {
  private client: MongoClient;
  private guests!: Collection<Guest>;
  private groups!: Collection<Group>;
  private messages!: Collection<LoggedMessage>;

  /**
   * Initializes the MongoService with the given connection parameters
   */
  constructor(
    private uri: string,
    private dbName: string,
    private guestCollection: string,
    private msgCollection: string,
    private groupsCollection: string
  ) {
    this.client = new MongoClient(this.uri);
  }

  /**
   * Connects to the MongoDB server and initializes the guests collection
   */
  public async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.guests = db.collection(this.guestCollection);
    this.messages = db.collection(this.msgCollection);
    this.groups = db.collection(this.groupsCollection);

    // índices
    await this.guests.createIndex(
      { number: 1 },
      { unique: true, name: "unique_number_idx" }
    );
    await this.messages.createIndex({ timestamp: -1 });
    await this.groups.createIndex({ groupId: 1 }, { unique: true });

    console.log(chalk.cyan("✅ MongoDB connected."));
  }

  // #region Guest Operations

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
      console.error(chalk.red("❌ Error registering group:"), err);
      return {
        acknowledged: false,
        message: "Erro ao registrar grupo",
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

  // #endregion

  // #region Messages Operations
  /**
   *  Adds a message to the messages collection.
   */
  public async addMessage(
    groupId: string,
    message: string,
    sender: string
  ): Promise<boolean> {
    try {
      const res = await this.messages.insertOne({
        groupId,
        message,
        timestamp: new Date(),
        sender,
      });
      return res.acknowledged;
    } catch (err: any) {
      console.error(chalk.red("❌ Error registering group:"), err);
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
      console.error(chalk.red("❌ Error fetching messages:"), err);
      throw err;
    }
  }

  // #endregion
}
