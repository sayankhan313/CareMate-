# CareMate+ Testing Evidence

This folder contains testing evidence for the CareMate+ backend API and integrated prototype workflows.

## Folder Structure

- `postman-screenshots/` contains screenshots of tested API endpoints and workflow results.
- `postman-export/` contains exported Postman collection and environment files.
- Automated backend tests are stored under `backend/tests/`.

## Testing Evidence Summary

The final testing evidence covers the main CareMate+ workflows across Patient, Doctor, Caregiver, Pharmacy and Admin roles.

| Evidence Range | Area | Coverage |
|---|---|---|
| 01–12 | Environment and Authentication | Environment setup, health check, registration, email verification, login, resend verification, current-user retrieval, token failure, forgot/reset password and password validation |
| 13–22 | Medicine Management | Medicine creation, listing, reminder handling, taken status, snooze, medicine update and deletion |
| 23–35 | Vitals and Safety Response | Stable, warning and critical vital creation, latest/history retrieval, dashboard state, critical-vital safety flow, alert creation, cancellation and escalation |
| 36–39 | Consultations | Manual consultation creation, consultation listing/detail and patient join configuration |
| 40–41 | Medicine and Prescription Scanning | Medicine scanning and prescription multi-medicine scan evidence |
| 42–48 | Doctor and Admin Workflows | Doctor registration, admin login, doctor verification/approval, monthly and daily availability, prescription creation |
| 49–61 | Pharmacy and Notifications | Pharmacy registration/approval, Firebase notification delivery, prescription order receipt, Stripe test payment and fulfilment workflow including unpaid-release rejection |
| 62–70 | Caregiver Workflows | Linked-patient access, unlink denial, medicine reminder, observation creation, appointment request, available doctor slots, alternate doctor routing, escalated safety access and linked-patient pharmacy orders |
| 71–76 | Exemption, Inventory and Pharmacy Security | Exemption evidence submission/review, verification, inventory matching, unrelated-pharmacy access denial and pending-pharmacy restriction |
| 77–80 | Access Control and Notification Handling | Assigned-doctor access, unassigned-doctor denial, out-of-office doctor rejection and skipped push handling when no active device token is present |

## Automated Backend Testing

Automated backend tests are included under `backend/tests/` and cover:

- Authentication and security
- Admin API and service behaviour
- Caregiver patient access and workflows
- Doctor consultations
- Doctor medicine reviews
- Doctor patient access control
- Doctor prescriptions
- Medicine OCR/reference matching
- Medicine review routing
- Medicine reminders and validation
- Pharmacy order workflows
- Safety response behaviour
- Vitals processing
- Smoke testing

## Final Validation

Before final integration, the following TypeScript checks were completed successfully:

```bash
cd backend
npx tsc --noEmit