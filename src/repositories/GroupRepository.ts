import { MongoClient, Collection, Filter } from "mongodb";
import { Group, GroupDailySummary } from "../models";

/**
 * Repository for group operations
 */
export class GroupRepository {
  private client: MongoClient;
  private dbName: string;
  private groups!: Collection<Group>;
  private groupDailySummary!: Collection<GroupDailySummary>;

  constructor(client: MongoClient, dbName: string) {
    this.client = client;
    this.dbName = dbName;
  }

  /**
   * Initializes the groups collections
   */
  public async initialize(): Promise<void> {
    const db = this.client.db(this.dbName);
    this.groups = db.collection("groups");
    this.groupDailySummary = db.collection("groupsDailySummary");

    // Create unique index on groupId
    await this.groups.createIndex({ groupId: 1 }, { unique: true });
    await this.groupDailySummary.createIndex({ timestamp: -1 });
  }

  /**
   * Adds a group to the list of those receiving the daily summary.
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
      return {
        acknowledged: false,
        message: "Erro ao registrar grupo",
      };
    }
  }

  /**
   * Remove a group to the list of those receiving the daily summary.
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
      return false;
    }
  }
}
