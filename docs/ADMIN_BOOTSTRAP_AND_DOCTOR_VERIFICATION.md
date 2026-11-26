# Administrator Account Bootstrap & Doctor Verification Guide

**Project:** Saksham – NeuroCare (`saksham-d3b71`, Firebase Spark Free Plan)

---

## 1. Root Cause of Unrecognized Admin Firebase Auth Accounts

Creating a user in **Firebase Console → Authentication → Users** only creates an authentication credential (`email` + `uid`).
It does **not** automatically set a Firebase Custom Claim (`role: 'admin'`) or create a Firestore role document at `users/{uid}`.

When `roleService.getUserRoleRecord(user)` signs a user in without a Custom Claim or an existing `users/{uid}` document, Saksham fails closed to least-privilege `{ role: 'patient', status: 'verified' }`, preventing unauthorized elevation and displaying an **Administrator Access Not Provisioned** / Role Mismatch error.

---

## 2. Option A — Spark-Free Firebase Console Bootstrap (Zero Cost / No CLI Needed)

1. Go to **Firebase Console → Authentication → Users** and copy the **User UID** of the admin email account you created.
2. Go to **Firebase Console → Firestore Database → Data**.
3. Create (or edit) document in collection **`users`** with exact **Document ID = `<User UID>`**:
   - `uid`: `"<User UID>"` *(string)*
   - `email`: `"<admin-email>"` *(string)*
   - `displayName`: `"Saksham System Administrator"` *(string)*
   - `role`: `"admin"` *(string)*
   - `status`: `"verified"` *(string — or `"active"`; required by `firestore.rules` `isAdmin()`)*
   - `createdAt`: `"2026-11-26T00:00:00.000Z"` *(string or Firestore timestamp)*
4. Sign out of the web app and sign in via **Administrator Hub** (`/login?role=admin`).

> Security invariant: `firestore.rules` (`allow create` on `users/{userId}`) strictly blocks any client or self-registered user from creating `role == 'admin'`, and `allow update` blocks owners from modifying `role`, `status`, or `verificationStatus`. Only an existing Admin or the Firebase Console / Admin SDK can provision administrators.

---

## 3. Option B — Trusted Firebase Admin SDK CLI Bootstrap

Run from a trusted administrator workstation (never commit service account JSON files or keys to Git):

```bash
cd backend
npm install
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
  npm run bootstrap:admin -- --email your-admin@example.com --name "Prof. Administrator"
```

Or by UID:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
  npm run bootstrap:admin -- --uid <FIREBASE_AUTH_UID>
```

This sets Custom Claim `{ role: 'admin' }`, upserts `users/{uid}`, and writes an `ADMIN_BOOTSTRAP` audit log entry.

---

## 4. Doctor Registration & Verification Lifecycle

- New clinician signups collect: Full Name, Email, Phone, Medical Qualification, License/Reg. Number, Registration Council/Authority, Specialty, Hospital/Clinic Affiliation, and optional Verification Document metadata/file.
- Initial state is strictly `status: "pending"` / `verificationStatus: "PENDING_VERIFICATION"`.
- Protected `/doctor` routes and `DoctorDashboard` remain blocked for `pending`, `additional_info_required`, `rejected`, and `suspended` accounts, displaying review notes and (when additional info is requested) a clarification response box.
- Only verified Administrators can transition doctors to `APPROVED` (`verified`), `ADDITIONAL_INFORMATION_REQUIRED`, `REJECTED`, or `SUSPENDED`, and assign approved doctors to specific patients (`doctorAssignments/{doctorId}_{patientId}`).

---

## 5. Account Deletion vs Deactivation on Spark Free

- Administrators can delete a user's Firestore registry record (`users/{uid}`) and revoke active `doctorAssignments` directly in **Admin Hub → User Management**.
- On the Spark Free client architecture (no deployed paid Cloud Functions Admin endpoint), deleting another user's **Firebase Authentication** login credential cannot be executed from the browser SDK; complete permanent Auth deletion in **Firebase Console → Authentication → Users** or with the Firebase Admin SDK.
