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
  senderPhone: string;
  senderWid: string;
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
