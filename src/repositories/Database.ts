import { MongoClient } from "mongodb";
import { logger } from "../utils/logger";
import { MONGO_URI, DB_NAME } from "../config";
import { GuestRepository } from "./GuestRepository";
import { GroupRepository } from "./GroupRepository";
import { MessageRepository } from "./MessageRepository";

/**
 * Database connection manager and repository container
 */
export class Database {
  private client: MongoClient;
  private dbName: string;
  public guests: GuestRepository;
  public groups: GroupRepository;
  public messages: MessageRepository;

  constructor() {
    this.client = new MongoClient(MONGO_URI);
    this.dbName = DB_NAME;
    this.guests = new GuestRepository(this.client, this.dbName);
    this.groups = new GroupRepository(this.client, this.dbName);
    this.messages = new MessageRepository(this.client, this.dbName);
  }

  /**
   * Connects to the MongoDB server and initializes all repositories
   */
  public async connect(): Promise<void> {
    await this.client.connect();
    await this.guests.initialize();
    await this.groups.initialize();
    await this.messages.initialize();
    logger.info("✅ MongoDB connected.");
  }

  /**
   * Closes the database connection
   */
  public async disconnect(): Promise<void> {
    await this.client.close();
    logger.info("✅ MongoDB disconnected.");
  }
}
