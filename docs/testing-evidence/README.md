# CareMate+ Testing Evidence

This folder contains testing evidence for the CareMate+ backend API.

## Folder Structure

- `postman-screenshots/` contains screenshots of tested API endpoints.
- `postman-export/` contains exported Postman collection and environment files.

## Current API Testing Evidence

| Test No. | Feature | Endpoint | Method | Status |
|---|---|---|---|---|
| 01 | Environment Setup | Postman Environment | N/A | Pending |
| 02 | Health Check | `/api/v1/health` | GET | Pending |
| 03 | Register Patient | `/api/v1/auth/register` | POST | Pending |
| 04 | Verify Email | `/api/v1/auth/verify-email?token=...` | GET | Pending |
| 05 | Login Patient | `/api/v1/auth/login` | POST | Pending |
| 06 | Resend Verification Email | `/api/v1/auth/resend-verification-email` | POST | Pending |

## Security Note

Sensitive values such as JWT tokens, verification tokens, passwords, database URLs, and secret keys should not be exposed in public screenshots or committed files.