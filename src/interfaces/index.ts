export interface Guest {
  _id?: string;
  name: string;
  number: string;
  addedAt: Date;
  receivedInvitation?: boolean;
  sendInvitation?: boolean;
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
  _id?: string;
  groupId: string;
}

export interface GroupDailySummary {
  _id?: string;
  groupId: string;
  timestamp: Date;
  totalMessages: number;
  top3Lines: string[];
}

export interface Vakinha {
  _id?: string;
  name: string;
  targetAmount: number;
  collectedAmount: number;
  creator: string;
  createdAt: Date;
  endDate?: Date;
  donors: Array<{
    number: string;
    amount: number;
    date: Date;
  }>;
}

export interface Settings {
  _id?: string;
  lastRechargeReminder?: Date;
}
