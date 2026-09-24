# CareMate+

**A secure multi-role Android healthcare-support application for medication management, remote monitoring, pharmacy fulfilment and care coordination.**

CareMate+ was developed as an MSc Advanced Computer Science project. It connects **Patients, Doctors, Caregivers, Pharmacy staff and Administrators** through one role-based mobile system, with a cloud-hosted backend and PostgreSQL database.

## 📱 Download Android App

**Latest Release:** CareMate+ v1.0.0

[⬇️ Download CareMate+ APK](https://github.com/sayankhan313/CareMate-/releases/download/v1.0.0/app-release.apk)

[View GitHub Release](https://github.com/sayankhan313/CareMate-/releases/tag/v1.0.0)

> The APK is provided for demonstration and portfolio purposes. Android may ask you to allow installation from unknown sources.

---

## 📖 Project Overview

CareMate+ demonstrates how a multi-role healthcare-support workflow can be implemented across an Android client, a secure backend API and a relational database.

The system provides support for:

- Multi-role authentication and authorisation
- Medication management and reminders
- OCR-assisted medicine and prescription capture
- Simulated vitals and Safety Response workflows
- Doctor review, prescription and consultation workflows
- Caregiver coordination
- Pharmacy ordering, exemption, payment and fulfilment
- Administrator verification and routing workflows
- Push notifications
- Transactional email
- Video consultations

> CareMate+ is an academic software prototype and is not a medical device.

---

## ☁️ Cloud Deployment

CareMate+ is deployed using a cloud-backed architecture.

```text
Android Application
        |
        | HTTPS
        v
Render Cloud
Dockerised Node.js / Express API
        |
        | Prisma ORM
        v
Supabase PostgreSQL
```

Additional integrations:

```text
Render Backend
├── Brevo -> Email verification and password reset
├── Firebase Cloud Messaging -> Push notifications
├── Jitsi/JaaS -> Video consultations
└── Stripe -> Test-mode payments
```

The Android application has been tested as a **standalone release APK without Metro, USB debugging or a local backend server**.

---

## ✨ Key Features

### Patient

- Patient dashboard
- Medicine management
- Medication reminders
- Taken / Missed / Snoozed dose tracking
- Google ML Kit OCR medicine scanning
- Prescription OCR support
- Reviewable OCR drafts
- Simulated health readings
- Android Health Connect integration where supported
- Safety Response workflow
- Doctor consultation requests
- Jitsi/JaaS video consultations
- Pharmacy requests
- Care Diary / Health Notes
- Notifications

### Doctor

- Professional registration and verification
- Assigned-patient access
- Patient overview
- Vitals history
- Medicine review
- Safety alerts
- Consultation management
- Consultation notes
- Manual prescriptions
- Prescription review
- Video consultations
- Availability management
- Availability-aware review routing
- Doctor fallback and reassignment workflow

### Caregiver

- Patient-caregiver linking
- Linked patient information
- Medicine schedule visibility
- Adherence monitoring
- Safety status
- Missed-dose notifications
- Reminder prompts
- Caregiver observations
- Consultation support
- Pharmacy order support

### Pharmacy

- Pharmacy professional verification
- Pharmacy dashboard
- Medicine and prescription orders
- Refill requests
- Order acceptance/rejection
- Inventory matching
- Pharmacy fulfilment workflow
- Prescription charge handling
- Exemption evidence review
- PPC support
- Stripe test-mode payments
- Pharmacy notifications

### Administrator

- Doctor verification
- Pharmacy verification
- Account approval/rejection
- User account management
- Medicine-review routing
- Admin-assisted reassignment
- Administrative oversight
- Audit-related functionality

---

## 🔐 Security and Trust

CareMate+ applies security controls across identity, roles, relationships and backend resources.

Key security mechanisms include:

- **bcrypt** password hashing
- **JWT** authentication
- Role-Based Access Control
- Relationship-aware authorisation
- Ownership-based resource access
- Assigned-doctor restrictions
- Explicit caregiver-patient linking
- Professional account verification
- Backend input validation
- PostgreSQL constraints and relationships
- Environment-based secret management
- Protected backend routes

Sensitive API keys and credentials are not stored directly inside the mobile application.

---

## 🛠️ Technology Stack

### Mobile

- React Native
- TypeScript
- React Navigation
- Redux Toolkit
- Firebase Cloud Messaging
- Google ML Kit OCR
- Android Health Connect
- Jitsi/JaaS
- Stripe React Native SDK

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- bcrypt
- Zod
- Firebase Admin SDK

### Cloud and External Services

- Docker
- Render
- Supabase PostgreSQL
- Brevo Transactional Email API
- Firebase Cloud Messaging
- Jitsi/JaaS
- Stripe Test Mode

---

## 🏗️ Repository Structure

```text
CareMate-/
├── backend/
│   ├── prisma/
│   ├── src/
│   └── tests/
│
├── mobile/
│   ├── android/
│   └── src/
│
├── docs/
│   └── testing-evidence/
│
├── README.md
└── FAQ.md
```

### `/backend`

Contains the Node.js/Express TypeScript backend including:

- Authentication
- API routes
- Controllers
- Services
- Validation
- Role-based access control
- Relationship-aware authorisation
- Notifications
- Business logic

### `/backend/prisma`

Contains:

- Prisma schema
- PostgreSQL models
- Database migrations
- Database configuration

### `/backend/tests`

Contains automated backend tests covering major application workflows.

### `/mobile`

Contains the React Native Android application including:

- Screens
- Navigation
- API services
- State management
- Notifications
- Android configuration

### `/docs/testing-evidence`

Contains supporting testing and project evidence.

---

## 🔄 Main Engineering Workflows

CareMate+ implements multiple cross-role workflows.

```text
Patient Medicine
      ↓
Reminder Schedule
      ↓
Taken / Missed / Snoozed
      ↓
Adherence History
```

```text
Medicine / Prescription Image
      ↓
Google ML Kit OCR
      ↓
Reviewable Draft
      ↓
Human Confirmation
      ↓
Persistence
```

```text
Critical Simulated Vital
      ↓
Safety Response
      ↓
Countdown
      ↓
Doctor / Caregiver Coordination
```

```text
Patient
   ↓
Assigned Doctor
   ↓
Medicine Review
   ↓
Availability-Aware Routing
   ↓
Fallback / Admin Reassignment
   ↓
Review Outcome
```

```text
Patient / Caregiver
      ↓
Pharmacy Request
      ↓
Pharmacy Review
      ↓
Payment / Exemption / PPC
      ↓
Fulfilment
```

```text
Doctor / Pharmacy Signup
      ↓
Professional Evidence
      ↓
Administrator Review
      ↓
Approve / Reject
```

---

## 🧪 Testing

CareMate+ was evaluated using multiple testing approaches including:

- Automated backend tests
- Authentication testing
- Positive security tests
- Negative security tests
- Role-based access testing
- Relationship-aware access testing
- API testing
- Postman integration testing
- OCR/reference matching evaluation
- Safety Response testing
- Doctor review and routing testing
- Pharmacy workflow testing
- Cross-role workflow testing
- Cloud backend testing
- PostgreSQL integration testing
- Standalone Android release testing

Testing evidence is stored under:

```text
/docs/testing-evidence
```

---

## 💻 Running the Backend Locally

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Generate Prisma Client:

```bash
npx prisma generate
```

Start development server:

```bash
npm run dev
```

Default local backend:

```text
http://localhost:5001
```

Required environment variables must be configured before starting the backend.

---

## 📱 Running the Mobile App Locally

Navigate to the mobile project:

```bash
cd mobile
```

Install dependencies:

```bash
npm install
```

Start Metro:

```bash
npm start
```

In another terminal:

```bash
npm run android
```

For a physical Android device:

```bash
adb reverse tcp:8081 tcp:8081
```

---

## 📦 Building the Android Release APK

Navigate to:

```bash
cd mobile/android
```

Build the release APK:

```bash
./gradlew assembleRelease
```

The generated APK is located at:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🚀 Deployment

The current deployment uses:

```text
React Native Android App
          ↓
        HTTPS
          ↓
Render Docker Backend
          ↓
      Prisma ORM
          ↓
Supabase PostgreSQL
```

Transactional email:

```text
Render
  ↓ HTTPS
Brevo API
  ↓
User Email
```

The deployment allows the Android release application to operate without requiring:

- Metro
- USB debugging
- A locally running backend
- The developer's computer

---

## ⚠️ Deployment Notes

- The backend is containerised using Docker.
- The public API communicates over HTTPS.
- PostgreSQL is hosted using Supabase.
- Transactional emails use the Brevo HTTPS API.
- Firebase Cloud Messaging is used for notifications.
- Jitsi/JaaS is used for video consultations.
- Stripe operates in **test mode**.
- Demo hosting may experience a short cold-start delay after inactivity.

---

## ⚕️ Project Scope and Disclaimer

CareMate+ is an **academic healthcare-support software prototype** developed for engineering demonstration, testing and portfolio purposes.

It is **not a medical device**.

The system does not provide:

- Autonomous medical diagnosis
- Autonomous prescribing
- Clinical validation
- Emergency medical decision-making
- Replacement for professional healthcare advice

Simulated or demonstration data should be used when publicly demonstrating the application.

---

## 👨‍💻 Author

**Sayan Suhel Khan**

MSc Advanced Computer Science  
University of Leicester

---

## 📥 Latest Release

**CareMate+ v1.0.0**

[⬇️ Download Android APK](https://github.com/sayankhan313/CareMate-/releases/download/v1.0.0/app-release.apk)

[View Release on GitHub](https://github.com/sayankhan313/CareMate-/releases/tag/v1.0.0)