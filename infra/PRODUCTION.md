# Production checklist

- [ ] Use managed PostgreSQL with PITR and tested restores.
- [ ] Replace development JWT secrets with KMS/secret-manager managed values.
- [ ] Configure a real SMS/OTP provider; never enable a fake OTP fallback.
- [ ] Configure a real payment provider and implement signed webhook verification, idempotency and reconciliation.
- [ ] Configure object storage with private buckets and signed URLs.
- [ ] Put API/web behind TLS + WAF + DDoS protection.
- [ ] Add OpenTelemetry traces, metrics and centralized logs/SIEM.
- [ ] Set real map/GPS and routing providers.
- [ ] Add CI security scanning, dependency updates, secret scanning and SAST.
- [ ] Establish RPO/RTO and perform disaster-recovery drills.
- [ ] Complete legal/compliance review applicable to Burkina Faso before production launch.
