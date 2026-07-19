import type { VoteRecord, VoteTally } from './model.js'

export function tallyVotes(
  votes: VoteRecord[],
  quorum: number,
  requiredApprovalPercent: number,
): VoteTally {
  const approvals = votes.filter((vote) => vote.choice === 'approve').length
  const rejections = votes.filter((vote) => vote.choice === 'reject').length
  const total = approvals + rejections
  const approvalPercent = total === 0 ? 0 : Math.round((approvals / total) * 10000) / 100
  const hasQuorum = total >= quorum

  return {
    approvals,
    rejections,
    total,
    quorum,
    approvalPercent,
    requiredApprovalPercent,
    remainingForQuorum: Math.max(0, quorum - total),
    decision: !hasQuorum ? 'pending' : approvalPercent >= requiredApprovalPercent ? 'approved' : 'rejected',
  }
}
