/**
 * Trusted Firebase Admin SDK Bootstrap Script (Spark Free Compatible)
 *
 * Provisions an existing Firebase Authentication account as a verified Saksham Administrator:
 *   1. Sets Custom Claim `{ role: 'admin' }` on the Firebase Auth user
 *   2. Upserts `users/{uid}` in Cloud Firestore with `role: 'admin'`, `status: 'verified'`
 *   3. Records an immutable `ADMIN_BOOTSTRAP` entry in `auditLogs`
 *
 * Security Invariants:
 *   - Uses Application Default Credentials / `GOOGLE_APPLICATION_CREDENTIALS` only
 *   - NEVER embeds private keys or runs from client code
 *   - Requires an explicit `--uid` or `--email` that ALREADY exists in Firebase Auth
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
 *     npm run bootstrap:admin -- --email admin@example.com --name "Administrator"
 */

import admin from 'firebase-admin';

interface CliArgs {
  uid?: string;
  email?: string;
  name?: string;
  projectId: string;
}

export function parseBootstrapArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'saksham-d3b71',
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--uid' && next) {
      args.uid = next.trim();
      i++;
    } else if (flag === '--email' && next) {
      args.email = next.trim();
      i++;
    } else if (flag === '--name' && next) {
      args.name = next.trim();
      i++;
    } else if (flag === '--project' && next) {
      args.projectId = next.trim();
      i++;
    }
  }

  if (!args.uid && !args.email) {
    throw new Error('Missing target user: provide --uid <firebaseUid> or --email <adminEmail>.');
  }

  return args;
}

export async function provisionAdminAccount(
  args: CliArgs,
  deps?: {
    auth?: Pick<admin.auth.Auth, 'getUser' | 'getUserByEmail' | 'setCustomUserClaims'>;
    firestore?: admin.firestore.Firestore;
  }
): Promise<{ uid: string; email: string | undefined; displayName: string }> {
  if (!deps) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: args.projectId });
    }
  }

  const authClient = deps?.auth || admin.auth();
  const dbClient = deps?.firestore || admin.firestore();

  const userRecord = args.uid
    ? await authClient.getUser(args.uid)
    : await authClient.getUserByEmail(args.email!);

  const displayName = args.name || userRecord.displayName || 'Saksham System Administrator';
  const existingClaims = (userRecord.customClaims as Record<string, any> | undefined) || {};

  // 1. Set Custom Claims (`role: 'admin'`)
  await authClient.setCustomUserClaims(userRecord.uid, {
    ...existingClaims,
    role: 'admin',
  });

  const nowIso = new Date().toISOString();

  // 2. Upsert Firestore `users/{uid}` document required by Firestore Rules & Admin UI
  const userDocRef = dbClient.collection('users').doc(userRecord.uid);
  const existingSnap = await userDocRef.get();
  const createdAt = existingSnap.exists ? existingSnap.data()?.createdAt || nowIso : nowIso;

  await userDocRef.set(
    {
      uid: userRecord.uid,
      email: userRecord.email || args.email || '',
      displayName,
      role: 'admin',
      status: 'verified',
      createdAt,
      updatedAt: nowIso,
      provisionedBy: 'trusted_admin_sdk_bootstrap',
    },
    { merge: true }
  );

  // 3. Record immutable audit entry in `auditLogs`
  await dbClient.collection('auditLogs').add({
    actorUid: 'trusted_cli_bootstrap',
    actorRole: 'system_admin_sdk',
    action: 'ADMIN_BOOTSTRAP',
    targetResource: `users/${userRecord.uid}`,
    timestamp: nowIso,
    result: 'CUSTOM_CLAIMS_AND_PROFILE_PROVISIONED',
    details: {
      uid: userRecord.uid,
      email: userRecord.email || null,
      role: 'admin',
      status: 'verified',
    },
  });

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName,
  };
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].includes('bootstrapAdmin');

if (isDirectExecution) {
  (async () => {
    try {
      const parsed = parseBootstrapArgs(process.argv.slice(2));
      const result = await provisionAdminAccount(parsed);
      console.log(
        `[Saksham Bootstrap] Provisioned admin account: uid=${result.uid}, email=${result.email || 'n/a'}, role=admin, status=verified`
      );
      console.log('[Saksham Bootstrap] Ask the administrator to sign out and sign back in so the refreshed ID token claims take effect.');
    } catch (err: any) {
      console.error(`[Saksham Bootstrap Error] ${err?.message || err}`);
      process.exit(1);
    }
  })();
}
