# SLO Alert Routing Policy (W123)

Critical SLO alerts (`domain: slo`, `severity: critical`) escalate via:
- **Business hours + weekend** → PagerDuty (`erp-pagerduty`)
- **Off-hours** → Opsgenie (`erp-opsgenie`)
- **All SLO** → Slack `#erp-slo-alerts` (`erp-slo` base receiver)

Configured in `infra/alertmanager/alertmanager.yml`.
