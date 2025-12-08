import { sendPing } from "../utils/sendPing";

/**
 * Job to send periodic ping to keep bot alive
 */
export class PingJob {
  public async execute(): Promise<void> {
    await sendPing("yasbot", 1);
  }
}

