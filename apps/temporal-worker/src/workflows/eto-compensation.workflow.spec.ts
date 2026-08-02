import { planEtoCompensation } from './eto-compensation.workflow';
import { planKsefRevenue } from './ksef-revenue.workflow';
import { isTemporalConfigured } from '../fallback-runner';

describe('Temporal workflows (Q2)', () => {
  it('plans ETO compensation steps', () => {
    const steps = planEtoCompensation({
      tenantId: 'default',
      projectId: 'p1',
      correlationId: 'c1',
    });
    expect(steps).toContain('reverse_wip');
    expect(steps).toContain('release_reservation');
    expect(steps).not.toContain('reverse_revenue');
  });

  it('includes reverse_revenue when flagged', () => {
    const steps = planEtoCompensation({
      tenantId: 'default',
      projectId: 'p1',
      correlationId: 'c1',
      reverseRevenue: true,
    });
    expect(steps).toContain('reverse_revenue');
  });

  it('plans KSeF revenue steps', () => {
    const steps = planKsefRevenue({
      tenantId: 'default',
      projectId: 'p1',
      correlationId: 'c1',
      amount: 1000,
    });
    expect(steps).toEqual(['send_ksef', 'recognize_revenue']);
  });

  it('isTemporalConfigured respects env', () => {
    expect(isTemporalConfigured({})).toBe(false);
    expect(isTemporalConfigured({ TEMPORAL_ADDRESS: 'localhost:7233' })).toBe(
      true,
    );
    expect(isTemporalConfigured({ TEMPORAL_HOST: '127.0.0.1' })).toBe(true);
  });
});
