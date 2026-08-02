/**
 * Temporal worker entry — starts only when TEMPORAL_ADDRESS is set.
 * Otherwise logs G-lite fallback mode and exits 0 (gate-friendly).
 */
import { isTemporalConfigured } from './fallback-runner';
import { ETO_COMPENSATION_WORKFLOW } from './workflows/eto-compensation.workflow';
import { KSEF_REVENUE_WORKFLOW } from './workflows/ksef-revenue.workflow';

async function main() {
  if (!isTemporalConfigured()) {
    console.log(
      JSON.stringify({
        service: 'temporal-worker',
        mode: 'fallback',
        note: 'TEMPORAL_ADDRESS unset — G-lite fallback active; worker not binding',
        workflows: [ETO_COMPENSATION_WORKFLOW.name, KSEF_REVENUE_WORKFLOW.name],
      }),
    );
    return;
  }

  const address = process.env.TEMPORAL_ADDRESS ||
    `${process.env.TEMPORAL_HOST || '127.0.0.1'}:${process.env.TEMPORAL_PORT || '7233'}`;

  try {
    // Dynamic import so package still loads without Temporal cluster
    const { NativeConnection, Worker } = await import('@temporalio/worker');
    const connection = await NativeConnection.connect({ address });
    const worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      taskQueue: ETO_COMPENSATION_WORKFLOW.taskQueue,
      workflowsPath: require('path').join(__dirname, 'workflows'),
      activities: await import('./activities/finance-activities'),
    });
    console.log(
      `temporal-worker listening taskQueue=${ETO_COMPENSATION_WORKFLOW.taskQueue} address=${address}`,
    );
    await worker.run();
  } catch (e) {
    console.error('temporal-worker failed to start:', (e as Error).message);
    console.log(
      JSON.stringify({
        service: 'temporal-worker',
        mode: 'fallback',
        error: (e as Error).message,
        note: 'Falling back to G-lite; exit 0 for optional Temporal',
      }),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
