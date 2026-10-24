# Steering — Product scope & privacy (Asthma Helper / AeriDay)

Applies to all work in this repository.

## Non-negotiable scope
- Non-diagnostic product. No attack probability, diagnosis, causal environmental claim, severity
  score, automated escalation, or treatment/prescription change — ever.
- No cloud health database, authentication service, generic REST server, analytics, remote LLM, or
  new HealthKit permission types. Browser preview is an explicitly synthetic prototype, never a
  substitute for native persistence or HealthKit.

## On-device data
- All health data stays on device. Development and demos use SYNTHETIC data only; never read, use
  or export a real personal record, even as a fixture.
- No health content in debug logs, telemetry or remote services. Demo data stays isolated and is
  visibly labeled (DEMO) across screens and exports.
- Preserve clinician-authored medication names, doses, units and action-plan text exactly. Do not
  infer missing purpose/regimen or adherence from inventory or reminders.

## Provenance & honesty
- Every data source exposes provenance, unit, timestamp, coverage and availability. A latest sample
  is not a daily aggregate. Missing / denied / partial / stale / failed reads stay distinguishable.
- Never fall back to demo data after a native failure. Never substitute mock success for missing
  native behavior; report blockers honestly with real evidence.
