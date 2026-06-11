[comment]: # (You may find the following markdown cheat sheet useful: https://www.markdownguide.org/cheat-sheet/. You may also consider using an online Markdown editor such as StackEdit.) 

## Project title: * CareMate+ : A Secure Android Healthcare Companion for Medication Management, Remote Monitoring, Pharmacy Fulfilment and Care Coordination*

### Student name: *Sayan Suhel Khan*

### Student email: *ssk53@student.le.ac.uk*

### Project description: 
*CareMate+ is a secure Android healthcare companion designed to support medication management, remote monitoring, pharmacy fulfilment and care coordination. The system will use role-based access for patients, doctors, caregivers, pharmacy staff and administrators. Patients will manage medicines, receive reminders, scan medicines or prescriptions using Google ML Kit OCR, view medicine information from a local database and monitor simulated vitals for safe testing. Critical simulated readings will trigger a Safety Response workflow with a countdown, doctor escalation and caregiver notification. Doctors will review assigned patient records, prescriptions, scanned medicine details, consultation notes and emergency alerts, while caregivers support adherence and pharmacy staff manage prescription or refill orders. The project will prioritise secure authentication, bcrypt password hashing, JWT-protected routes, ownership-based data access, audit trails and admin verification of doctors and pharmacies using GMC/GPhC register links.*

### List of requirements (objectives): 

[comment]: # (You can add as many additional bullet points as necessary by adding an additional hyphon symbol '-' at the end of each list) 

Essential:

**Security and Core Platform**
- Implement secure registration and login for all user roles using bcrypt password hashing, JWT authentication and protected backend routes.
- Implement role-based access control middleware for Patient, Doctor, Caregiver, Pharmacy and Admin users.
- Implement ownership-based data access so users can only access authorised records, such as their own patient data, linked patients, assigned patients or pharmacy orders.
- Restrict doctor and pharmacy accounts until Admin manual verification is completed using submitted GMC/GPhC details, uploaded supporting documents and direct links to the official public registers.
- Store medical-style data securely in PostgreSQL using Prisma, with backend validation, database relationships and necessary constraints.
- Maintain a basic audit trail for sensitive actions such as professional verification, medicine changes, emergency alerts, prescriptions and pharmacy order updates.
- Store secrets and API keys in backend environment variables and avoid exposing them in the mobile app.

**Patient**
- Provide a patient dashboard showing medicines, reminders, latest vitals, safety status, consultations, pharmacy orders and history.
- Allow patients to add, view, edit and delete medicines manually.
- Implement medicine scanning using Google ML Kit OCR to extract possible medicine name, strength, dosage and timing from a medicine box or prescription image.
- Provide medicine information from a local medicine database, including basic use, warnings, side effects and reminder support.
- Implement medication reminders with taken, missed and snoozed dose tracking.
- Implement simulated vitals for heart rate, SpO2, blood pressure, glucose and temperature to safely demonstrate monitoring and emergency workflows without using real patient data.
- Implement a Safety Response workflow where critical simulated vitals trigger a countdown, allow cancellation and escalate to a doctor alert if not cancelled.
- Allow patients to request doctor consultations and join video calls using Jitsi/JaaS.

**Doctor**
- Provide a verified doctor dashboard showing assigned patients, consultation requests, safety alerts, prescriptions and recent patient activity.
- Allow doctors to view assigned patient profiles, medicine lists, reminder history, vitals history and consultation history.
- Allow doctors to review patient medicine information and scanned medicine details shared by the patient.
- Allow doctors to create prescriptions manually for assigned patients.
- Allow doctors to upload or review prescription images using OCR-assisted medicine detection.
- Allow doctors to add OCR-detected prescription medicines to the patient’s medicine list and reminder schedule after reviewing the extracted details.
- Allow doctors to add consultation notes and update patient care records after appointments.
- Allow doctors to accept or reject patient consultation requests.
- Allow doctors to respond to emergency safety alerts triggered by critical simulated vitals.
- Allow doctors and patients to join video consultations using Jitsi/JaaS.
- Ensure doctors can only access patients assigned or linked to them through authorised system relationships.

**Caregiver**
- Provide a caregiver dashboard showing linked patients, medicine reminders, missed doses, latest safety status, alerts and pharmacy order progress.
- Allow caregivers to be linked with one or more patients through an authorised patient-caregiver relationship.
- Allow caregivers to view medicine schedules and reminder status for linked patients.
- Allow caregivers to view selected vitals and safety status for linked patients.
- Notify caregivers when a linked patient misses a dose or when a critical simulated vitals alert is triggered.
- Allow caregivers to send reminder prompts to linked patients for missed or upcoming medicines.
- Allow caregivers to track consultation status and pharmacy order progress for linked patients.
- Ensure caregivers can only access records for patients they are officially linked to.

**Pharmacy**
- Provide a pharmacy dashboard showing prescription, refill and medicine order requests.
- Allow pharmacy staff to view order details and prescribed or requested medicines needed to process the order.
- Allow pharmacy staff to accept or reject pharmacy orders.
- Allow pharmacy staff to update order status, such as pending, accepted, preparing, ready or completed.
- Allow patients and caregivers to track pharmacy order progress.

**Admin**
- Provide an admin dashboard to view doctor and pharmacy verification requests.
- Allow Admin users to review submitted GMC/GPhC details and uploaded supporting documents.
- Provide direct links to the official GMC and GPhC public registers for manual verification.
- Allow Admin users to approve or reject doctor and pharmacy accounts.
- Allow Admin users to manage basic user account status, such as active, pending or rejected.


Desirable:

**Security and Core Platform**
- Add email verification or one-time verification code during registration.
- Add password reset functionality using secure time-limited reset tokens.

**Patient**
- Allow patients to add scanned medicines directly to their medicine list and reminder schedule after confirming the extracted details.
- Allow patients to send scanned medicine information to a doctor for consultation or review.
- Add a medication adherence history view showing taken and missed doses over time.
- Add simple patient reports summarising medicines, vitals, missed doses and consultation history.
- Allow patients to place pharmacy refill or order requests from active prescriptions or medicines.
- Allow patients to create short health notes or care diary entries about symptoms, side effects, medicines and daily wellbeing.

**Doctor**
- Add a doctor-side patient report view summarising medicines, missed doses, vitals trends, consultations and safety events.
- Allow doctors to review scanned medicine information and advise whether it should be added to the patient’s reminder schedule.
- Allow doctors to view patient health notes or care diary entries shared by the patient.
- Add appointment scheduling or follow-up request functionality between doctor and patient.

**Caregiver**
- Allow caregivers to add care notes or observations for linked patients.
- Allow caregivers to request or schedule doctor consultations for linked patients.

**Pharmacy**
- Allow pharmacy staff to add short order notes, such as medicine availability, collection instructions or rejection reason.
- Add pharmacy-side notifications for new prescription or refill order requests.

**Admin**
- Add basic dashboard summaries showing pending verifications, approved professionals and recent account activity.


Optional:

**Patient**
- Integrate Health Connect to read available real device health data where supported.
- Add external medicine API integration to enrich medicine information beyond the local database.

**Doctor**
- Add visual analytics for doctors to review patient adherence patterns, repeated missed-dose trends, vitals trends, emergency alerts and patient note patterns.

**Advanced / Future Extensions**
- Add visual dashboards or heatmaps for medication adherence, missed doses, emergency alerts, vitals trends and patient note patterns.
- Add simple text/log analysis of patient notes, safety logs or missed-dose logs to identify repeated issues or common patterns.
- Deploy the backend, database and mobile-facing API to a cloud platform for remote testing and demonstration.


## Information about this repository
This is the repository that you are going to use **individually** for developing your project. Please use the resources provided in the module to learn about **plagiarism** and how plagiarism awareness can foster your learning.

Regarding the use of this repository, once a feature (or part of it) is developed and **working** or parts of your system are integrated and **working**, define a commit and push it to the remote repository. You may find yourself making a commit after a productive hour of work (or even after 20 minutes!), for example. Choose commit message wisely and be concise.

Please choose the structure of the contents of this repository that suits the needs of your project but do indicate in this file where the main software artefacts are located.

## Planned repository structure

- `/mobile` - React Native Android application for patient, doctor, caregiver, pharmacy and admin screens.
- `/backend` - Node.js/Express TypeScript backend for authentication, role-based access, APIs and business logic.
- `/database` - PostgreSQL and Prisma schema, migrations and seed data.
- `/docs` - dissertation-related materials.
- `/tests` - API, role-based access, OCR, reminder and emergency workflow testing resources.
- `/deployment` - optional deployment configuration and environment setup notes.

## Main software artefacts

The main software artefacts will be the React Native Android application, Node.js/Express backend API, PostgreSQL database schema, Prisma models, authentication and role-based access middleware, OCR-assisted medicine scanning workflow, medicine reminder system, simulated vitals and Safety Response workflow, Jitsi/JaaS consultation integration, pharmacy order workflow and admin verification dashboard.