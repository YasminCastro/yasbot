import { Message, GroupChat } from "whatsapp-web.js";

/**
 * Checks if message is from a group
 */
export async function requireGroup(
  message: Message
): Promise<GroupChat | null> {
  const chat = await message.getChat();
  if (!chat.isGroup) {
    return null;
  }
  return chat as GroupChat;
}

/**
 * Gets group ID from message
 */
export async function getGroupId(message: Message): Promise<string | null> {
  const group = await requireGroup(message);
  return group ? group.id._serialized : null;
}
