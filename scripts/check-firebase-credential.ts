/**
 * Diagnose Firebase Admin credential without sending pushes to devices.
 *
 * On the VPS (from repo root):
 *   npx ts-node -r tsconfig-paths/register scripts/check-firebase-credential.ts
 *
 * Or after build:
 *   node -r dotenv/config -e "..."  (see README notes)
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import '../src/bootstrap-env';

function loadCredential(): { credential: ServiceAccount; source: string } {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    return {
      credential: JSON.parse(jsonEnv) as ServiceAccount,
      source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
    };
  }

  const pathEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    'config/firebase-service-account.json';
  const candidates = [
    pathEnv.startsWith('/') ? pathEnv : join(process.cwd(), pathEnv),
    join(process.cwd(), 'config', 'firebase-service-account.json'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return {
        credential: JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount,
        source: path,
      };
    }
  }

  throw new Error(
    'No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT_PATH or place config/firebase-service-account.json',
  );
}

async function main(): Promise<void> {
  const { credential: raw, source } = loadCredential();
  const asAny = raw as unknown as Record<string, unknown>;

  const projectId = String(asAny.project_id || asAny.projectId || '');
  const clientEmail = String(asAny.client_email || asAny.clientEmail || '');
  const privateKey = String(asAny.private_key || asAny.privateKey || '');

  console.log('--- Firebase credential check ---');
  console.log('source:', source);
  console.log('project_id:', projectId || '(missing)');
  console.log('client_email:', clientEmail || '(missing)');
  console.log('private_key present:', privateKey.length > 0);
  console.log('private_key has BEGIN marker:', privateKey.includes('BEGIN PRIVATE KEY'));
  console.log(
    'private_key newline style:',
    privateKey.includes('\\n') && !privateKey.includes('\n')
      ? 'ESCAPED_LITERAL_\\\\n (BAD — often causes invalid-credential)'
      : privateKey.includes('\n')
        ? 'real newlines (ok)'
        : 'unknown/flat',
  );
  console.log('utc now:', new Date().toISOString());

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Service account JSON is missing project_id, client_email, or private_key');
  }

  // Normalize escaped newlines if someone pasted JSON badly.
  const normalized: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey: privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey,
  };

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(normalized),
      projectId,
    });
  }

  // Force a Google OAuth token fetch — this is what fails for app/invalid-credential.
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: normalized.privateKey,
      project_id: projectId,
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    console.log('oauth access token:', token.token ? 'OK' : 'EMPTY');
  } catch (err) {
    console.error('oauth access token: FAIL');
    console.error(err instanceof Error ? err.message : err);
    console.error(
      '\nFix: create a NEW key for firebase-adminsdk@… in the SAME project as the mobile apps,',
      'download JSON, scp it to config/firebase-service-account.json without editing,',
      'enable "Firebase Cloud Messaging API" in Google Cloud, then pm2 restart.',
    );
    process.exit(1);
  }

  // Dry messaging call with a clearly fake token — should NOT return invalid-credential.
  try {
    await getMessaging().send(
      {
        token: 'diagnostic-invalid-token-do-not-use',
        notification: { title: 'credential-check', body: 'ignore' },
      },
      true, // dryRun
    );
    console.log('messaging dry-run: unexpected success');
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    const message = err instanceof Error ? err.message : String(err);
    console.log('messaging dry-run error code:', code || '(none)');
    console.log('messaging dry-run message:', message);

    if (code.includes('invalid-credential') || message.includes('invalid-credential')) {
      console.error(
        '\nStill app/invalid-credential after OAuth OK — check Firebase Cloud Messaging API is enabled for this project.',
      );
      process.exit(1);
    }

    if (
      code.includes('invalid-argument') ||
      code.includes('registration-token-not-registered') ||
      code.includes('invalid-registration-token') ||
      message.toLowerCase().includes('not a valid fcm') ||
      message.toLowerCase().includes('requested entity was not found')
    ) {
      console.log(
        'messaging dry-run: credential ACCEPTED (failure is expected for fake token)',
      );
      console.log('RESULT: Firebase Admin credential looks valid.');
      return;
    }

    console.error('Unexpected messaging error — investigate the code/message above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
