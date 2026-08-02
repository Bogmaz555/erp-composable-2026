import { defineSignal, setHandler, sleep } from '@temporalio/workflow';

export const approveSignal = defineSignal('approve');
export const rejectSignal = defineSignal('reject');

export async function approvalWorkflow(entityId: string, entityType: string): Promise<string> {
  let isApproved: boolean | null = null;

  setHandler(approveSignal, () => {
    isApproved = true;
  });

  setHandler(rejectSignal, () => {
    isApproved = false;
  });

  // Wait until approved or rejected, or timeout after 7 days
  let waited = 0;
  while (isApproved === null && waited < 7 * 24 * 60 * 60 * 1000) {
    await sleep('1 minute');
    waited += 60000;
  }

  if (isApproved === true) return 'APPROVED';
  if (isApproved === false) return 'REJECTED';
  return 'TIMEOUT';
}
