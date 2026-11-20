/** Operator pick-list for employer conversations. Unknown historical values stay unchanged. */
export const conversationStatuses = ['Prospect', 'Contacted', 'Conversation', 'Following up', 'Partner', 'Paused'] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

const replaced: Record<string, ConversationStatus> = {
  Proposal: 'Following up',
  Committed: 'Partner',
  Active: 'Partner',
  Discovery: 'Conversation',
};

export function mapConversationStatus(status: string): string {
  return replaced[status] ?? status;
}
