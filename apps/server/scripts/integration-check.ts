import 'reflect-metadata';

import { joinUrl, unwrapApiResponse } from '@mall/api-sdk';

import { validateEnv } from '../src/modules/config/env.validation';

const apiBaseUrl = process.env.INTEGRATION_API_BASE_URL ?? 'http://localhost:3000';
const loginMode = process.env.WECHAT_LOGIN_MODE ?? 'mock';
const payMode = process.env.WECHAT_PAY_MODE ?? 'mock';
const miniappPaymentMode = process.env.TARO_APP_PAYMENT_MODE ?? 'mock';
const shouldSkipApiCheck = process.env.INTEGRATION_SKIP_API_CHECK === '1';
const shouldCheckNotifyUrl = process.env.INTEGRATION_CHECK_NOTIFY_URL === '1';
const shouldRequireRealModes = process.env.INTEGRATION_REQUIRE_REAL === '1';

function step(message: string) {
  console.log(`- ${message}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function validateModeCombination() {
  validateEnv(process.env);
  step(`server env ok: WECHAT_LOGIN_MODE=${loginMode}, WECHAT_PAY_MODE=${payMode}`);

  assert(
    miniappPaymentMode === 'mock' || miniappPaymentMode === 'real',
    'TARO_APP_PAYMENT_MODE must be mock or real.',
  );

  if (payMode === 'real') {
    assert(
      miniappPaymentMode === 'real',
      'WECHAT_PAY_MODE=real should be paired with TARO_APP_PAYMENT_MODE=real.',
    );
  }

  if (miniappPaymentMode === 'real') {
    assert(
      payMode === 'real',
      'TARO_APP_PAYMENT_MODE=real requires WECHAT_PAY_MODE=real on the server.',
    );
  }

  step(`miniapp payment mode ok: TARO_APP_PAYMENT_MODE=${miniappPaymentMode}`);

  if (shouldRequireRealModes) {
    assert(loginMode === 'real', 'INTEGRATION_REQUIRE_REAL=1 requires WECHAT_LOGIN_MODE=real.');
    assert(payMode === 'real', 'INTEGRATION_REQUIRE_REAL=1 requires WECHAT_PAY_MODE=real.');
    assert(
      miniappPaymentMode === 'real',
      'INTEGRATION_REQUIRE_REAL=1 requires TARO_APP_PAYMENT_MODE=real.',
    );
    step('real mode requirement ok');
  }
}

async function checkApiHealth() {
  if (shouldSkipApiCheck) {
    step('api health check skipped');
    return;
  }

  const response = await fetch(joinUrl(apiBaseUrl, '/api/health'));
  unwrapApiResponse<unknown>(await readJson(response), response.status);
  step(`api health ok: ${apiBaseUrl}`);
}

async function checkSwagger() {
  if (shouldSkipApiCheck) {
    step('swagger check skipped');
    return;
  }

  const response = await fetch(joinUrl(apiBaseUrl, '/docs-json'));
  assert(response.ok, `Swagger docs-json should be available, got ${response.status}.`);
  step('swagger docs-json ok');
}

async function checkNotifyUrl() {
  if (payMode !== 'real') {
    step('notify url check skipped for mock pay mode');
    return;
  }

  const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL;
  assert(notifyUrl?.startsWith('https://'), 'WECHAT_PAY_NOTIFY_URL must be an HTTPS URL.');
  assert(
    notifyUrl.endsWith('/api/payments/wechat/notify'),
    'WECHAT_PAY_NOTIFY_URL should end with /api/payments/wechat/notify.',
  );
  const refundNotifyUrl =
    process.env.WECHAT_PAY_REFUND_NOTIFY_URL ??
    notifyUrl.replace('/api/payments/wechat/notify', '/api/refunds/wechat/notify');
  assert(
    refundNotifyUrl.startsWith('https://'),
    'WECHAT_PAY_REFUND_NOTIFY_URL must be an HTTPS URL.',
  );
  assert(
    refundNotifyUrl.endsWith('/api/refunds/wechat/notify'),
    'WECHAT_PAY_REFUND_NOTIFY_URL should end with /api/refunds/wechat/notify.',
  );

  if (!shouldCheckNotifyUrl) {
    step('payment and refund notify url format ok; remote reachability check skipped');
    return;
  }

  const response = await fetch(notifyUrl, { method: 'HEAD' });
  assert(response.status < 500, `Notify URL should be reachable, got ${response.status}.`);
  const refundResponse = await fetch(refundNotifyUrl, { method: 'HEAD' });
  assert(
    refundResponse.status < 500,
    `Refund notify URL should be reachable, got ${refundResponse.status}.`,
  );
  step('payment and refund notify url reachable');
}

async function run() {
  console.log(`Integration check started against ${apiBaseUrl}`);

  validateModeCombination();
  await checkApiHealth();
  await checkSwagger();
  await checkNotifyUrl();

  console.log('Integration check passed.');
}

run().catch((error: unknown) => {
  console.error(`Integration check failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
