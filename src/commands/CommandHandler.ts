import { Message } from "whatsapp-web.js";
import { isAdmin } from "../middlewares";
import { AllCommand, HelloCommand, RainCommand, GenteCommand } from "./common";
import { AdminCommand, AddGroupCommand, RemoveGroupCommand } from "./admin";
import { PartyInviteCommands } from "./party";
import { MentionService } from "../services/MentionService";
import { GreetingService } from "../services/GreetingService";
import { WeatherService } from "../services/WeatherService";
import { MessageService } from "../services/MessageService";
import { AdminService } from "../services/AdminService";
import { PartyInviteService } from "../services/PartyInviteService";
import { Database } from "../repositories/Database";

/**
 * Main command handler that routes messages to appropriate commands
 */
export class CommandHandler {
  // Common commands
  private allCommand: AllCommand;
  private helloCommand: HelloCommand;
  private rainCommand: RainCommand;
  private genteCommand: GenteCommand;

  // Admin commands
  private adminCommand: AdminCommand;
  private addGroupCommand: AddGroupCommand;
  private removeGroupCommand: RemoveGroupCommand;

  // Party commands
  private partyInviteCommands: PartyInviteCommands;

  constructor(
    mentionService: MentionService,
    greetingService: GreetingService,
    weatherService: WeatherService,
    private messageService: MessageService,
    adminService: AdminService,
    partyInviteService: PartyInviteService,
    private database: Database
  ) {
    // Initialize common commands
    this.allCommand = new AllCommand(mentionService);
    this.helloCommand = new HelloCommand(greetingService);
    this.rainCommand = new RainCommand(weatherService);
    this.genteCommand = new GenteCommand(greetingService);

    // Initialize admin commands
    this.adminCommand = new AdminCommand(adminService);
    this.addGroupCommand = new AddGroupCommand(adminService);
    this.removeGroupCommand = new RemoveGroupCommand(adminService);

    // Initialize party commands
    this.partyInviteCommands = new PartyInviteCommands(partyInviteService);
  }

  /**
   * Handles incoming messages and routes to appropriate commands
   */
  public async handle(message: Message): Promise<void> {
    if (message.fromMe) return;

    const chat = await message.getChat();
    const text = message.body.trim().toLowerCase();

    // Add message to database if it's from a group
    if (chat.isGroup) {
      const groupId = (chat as any).id._serialized;
      await this.messageService.addMessage(message, groupId);
    }

    // Handle party invite commands (private chats only)
    if (!chat.isGroup) {
      const handled = await this.partyInviteCommands.handleCommand(
        message,
        text
      );
      if (handled) return;
    }

    // Handle admin commands
    if (isAdmin(message)) {
      if (text.includes("@admin")) {
        await this.adminCommand.execute(message);
        return;
      }

      if (text.includes("@add-group")) {
        await this.addGroupCommand.execute(message);
        return;
      }

      if (text.includes("@remove-group")) {
        await this.removeGroupCommand.execute(message);
        return;
      }
    }

    // Handle common commands
    if (text === "!all" || text === "!todos") {
      await this.allCommand.execute(message);
      return;
    }

    if (text === "oi" || text === "olá" || text === "oie") {
      await this.helloCommand.execute(message);
      return;
    }

    // Rain command
    const rainHandled = await this.rainCommand.execute(message);
    if (rainHandled) return;

    // Gente command (only for registered groups)
    if (chat.isGroup) {
      const groupId = (chat as any).id._serialized;
      const groupIds = await this.database.groups.getGroups();
      if (groupIds.includes(groupId)) {
        if (text === "gente" || text === "gebte") {
          await this.genteCommand.execute(message);
          return;
        }
      }
    }
  }
}
