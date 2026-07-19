import assert from 'node:assert/strict'
import test from 'node:test'
import { tallyVotes } from './governance.js'
import type { VoteRecord } from './model.js'

function vote(choice: 'approve' | 'reject', index: number): VoteRecord {
  return { voterHash: `voter-${index}`, choice, updatedAt: '2026-07-19T00:00:00.000Z' }
}

test('keeps a proposal pending before quorum', () => {
  const tally = tallyVotes([vote('approve', 1), vote('approve', 2)], 5, 66)
  assert.equal(tally.decision, 'pending')
  assert.equal(tally.remainingForQuorum, 3)
})

test('approves after quorum and threshold', () => {
  const tally = tallyVotes(
    [vote('approve', 1), vote('approve', 2), vote('approve', 3), vote('approve', 4), vote('reject', 5)],
    5,
    66,
  )
  assert.equal(tally.decision, 'approved')
  assert.equal(tally.approvalPercent, 80)
})

test('does not approve a majority below the configured threshold', () => {
  const tally = tallyVotes(
    [vote('approve', 1), vote('approve', 2), vote('approve', 3), vote('reject', 4), vote('reject', 5)],
    5,
    66,
  )
  assert.equal(tally.decision, 'rejected')
  assert.equal(tally.approvalPercent, 60)
})
