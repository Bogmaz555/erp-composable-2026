export {
  planEtoCompensation,
  ETO_COMPENSATION_WORKFLOW,
  type EtoCompensationInput,
  type EtoCompensationResult,
} from './workflows/eto-compensation.workflow';
export {
  planKsefRevenue,
  KSEF_REVENUE_WORKFLOW,
  type KsefRevenueInput,
  type KsefRevenueResult,
} from './workflows/ksef-revenue.workflow';
export {
  runEtoCompensationFallback,
  runKsefRevenueFallback,
  isTemporalConfigured,
} from './fallback-runner';
