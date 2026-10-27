/**
 * Generate a VAPID key pair for Web Push (npm run generate-vapid).
 *
 * Prints a fresh public/private key pair to STDOUT for the operator to paste
 * into their environment (WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY). It never
 * writes secrets to disk and never reads or mutates any env file — copying the
 * values into a secret manager is the operator's responsibility.
 */

import webpush from 'web-push';

function main(): void {
  const { publicKey, privateKey } = webpush.generateVAPIDKeys();

  // Human-readable guidance on stderr so STDOUT stays easy to pipe/parse.
  process.stderr.write(
    'Generated a new VAPID key pair. Add these to your environment (do NOT commit them):\n\n',
  );

  // The actual key material goes to stdout.
  process.stdout.write(`WEB_PUSH_PUBLIC_KEY=${publicKey}\n`);
  process.stdout.write(`WEB_PUSH_PRIVATE_KEY=${privateKey}\n`);

  process.stderr.write(
    '\nAlso set WEB_PUSH_SUBJECT to a mailto: or https: contact URL, e.g.\n' +
      'WEB_PUSH_SUBJECT=mailto:ops@your-domain.example\n',
  );
}

main();
