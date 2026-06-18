import { existsSync } from 'node:fs';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface CheckResult {
  message: string;
  status: CheckStatus;
}

const target = process.env.DEPLOYMENT_PREFLIGHT_TARGET ?? 'production';
const shouldSkipFileCheck = process.env.DEPLOYMENT_PREFLIGHT_SKIP_FILE_CHECK === '1';
const results: CheckResult[] = [];

function add(status: CheckStatus, message: string) {
  results.push({ status, message });
}

function value(name: string) {
  return process.env[name]?.trim();
}

function hasValue(name: string) {
  return Boolean(value(name));
}

function isHttpsUrl(rawValue: string | undefined) {
  if (!rawValue) {
    return false;
  }

  try {
    return new URL(rawValue).protocol === 'https:';
  } catch {
    return false;
  }
}

function includesLocalhost(rawValue: string | undefined) {
  return Boolean(rawValue && /(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(rawValue));
}

function checkRequired(name: string) {
  if (hasValue(name)) {
    add('pass', `${name} is set`);
    return;
  }

  add('fail', `${name} is required`);
}

function checkRequiredHttpsUrl(name: string) {
  const rawValue = value(name);

  if (!rawValue) {
    add('fail', `${name} is required`);
    return;
  }

  if (!isHttpsUrl(rawValue)) {
    add('fail', `${name} must be an HTTPS URL`);
    return;
  }

  if (includesLocalhost(rawValue)) {
    add('fail', `${name} must not point to localhost in ${target}`);
    return;
  }

  add('pass', `${name} is a public HTTPS URL`);
}

function checkSecret(name: string, blockedValues: string[]) {
  const rawValue = value(name);

  if (!rawValue) {
    add('fail', `${name} is required`);
    return;
  }

  if (blockedValues.includes(rawValue) || rawValue.length < 32) {
    add('fail', `${name} must be rotated from local defaults and be at least 32 characters`);
    return;
  }

  add('pass', `${name} looks rotated`);
}

function checkExistingFile(name: string) {
  const filePath = value(name);

  if (!filePath) {
    add('fail', `${name} is required`);
    return;
  }

  if (shouldSkipFileCheck) {
    add('warn', `${name} file existence check skipped`);
    return;
  }

  if (!existsSync(filePath)) {
    add('fail', `${name} does not exist: ${filePath}`);
    return;
  }

  add('pass', `${name} file exists`);
}

function checkProductionRuntime() {
  if (value('NODE_ENV') === 'production') {
    add('pass', 'NODE_ENV=production');
  } else {
    add('fail', 'NODE_ENV must be production');
  }

  checkRequired('PORT');
  checkRequired('DATABASE_URL');

  const databaseUrl = value('DATABASE_URL');
  if (includesLocalhost(databaseUrl)) {
    add('fail', 'DATABASE_URL must not point to localhost in production');
  }
  if (databaseUrl && /(mall_password|root_password)/i.test(databaseUrl)) {
    add('fail', 'DATABASE_URL appears to contain a local/default password');
  }

  checkRequired('REDIS_HOST');
  if (includesLocalhost(value('REDIS_HOST'))) {
    add('fail', 'REDIS_HOST must not point to localhost in production');
  }

  checkSecret('JWT_ACCESS_SECRET', ['change-me-access-secret']);
  checkSecret('JWT_REFRESH_SECRET', ['change-me-refresh-secret']);

  if (value('ADMIN_DEFAULT_PASSWORD') === 'Admin123456') {
    add('fail', 'ADMIN_DEFAULT_PASSWORD must be rotated from the local default');
  } else {
    checkRequired('ADMIN_DEFAULT_PASSWORD');
  }

  checkRequiredHttpsUrl('PUBLIC_BASE_URL');
}

function checkUploadStorage() {
  const uploadStorage = value('UPLOAD_STORAGE') ?? 'local';

  if (uploadStorage === 'cos') {
    checkRequired('TENCENT_COS_SECRET_ID');
    checkRequired('TENCENT_COS_SECRET_KEY');
    checkRequired('TENCENT_COS_BUCKET');
    checkRequired('TENCENT_COS_REGION');
    add('pass', 'UPLOAD_STORAGE=cos');
    return;
  }

  if (uploadStorage === 'local') {
    add('warn', 'UPLOAD_STORAGE=local; confirm persistent disk, backup, and public asset serving');
    checkRequired('UPLOAD_LOCAL_DIR');
    return;
  }

  add('fail', 'UPLOAD_STORAGE must be local or cos');
}

function checkWechatModes() {
  if (value('WECHAT_LOGIN_MODE') !== 'real') {
    add('fail', 'WECHAT_LOGIN_MODE must be real');
  } else {
    add('pass', 'WECHAT_LOGIN_MODE=real');
  }

  checkRequired('WECHAT_MINIAPP_APP_ID');
  checkRequired('WECHAT_MINIAPP_SECRET');

  if (value('WECHAT_PAY_MODE') !== 'real') {
    add('fail', 'WECHAT_PAY_MODE must be real');
  } else {
    add('pass', 'WECHAT_PAY_MODE=real');
  }

  checkRequired('WECHAT_PAY_MCH_ID');
  checkRequired('WECHAT_PAY_SERIAL_NO');
  checkSecret('WECHAT_PAY_API_V3_KEY', []);
  checkExistingFile('WECHAT_PAY_PRIVATE_KEY_PATH');
  checkExistingFile('WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH');
  checkRequiredHttpsUrl('WECHAT_PAY_NOTIFY_URL');

  if (!value('WECHAT_PAY_NOTIFY_URL')?.endsWith('/api/payments/wechat/notify')) {
    add('fail', 'WECHAT_PAY_NOTIFY_URL should end with /api/payments/wechat/notify');
  }

  const refundNotifyUrl =
    value('WECHAT_PAY_REFUND_NOTIFY_URL') ??
    value('WECHAT_PAY_NOTIFY_URL')?.replace(
      '/api/payments/wechat/notify',
      '/api/refunds/wechat/notify',
    );

  if (!refundNotifyUrl?.startsWith('https://')) {
    add('fail', 'WECHAT_PAY_REFUND_NOTIFY_URL should be an HTTPS URL');
  } else if (!refundNotifyUrl.endsWith('/api/refunds/wechat/notify')) {
    add('fail', 'WECHAT_PAY_REFUND_NOTIFY_URL should end with /api/refunds/wechat/notify');
  } else {
    add('pass', 'WECHAT_PAY_REFUND_NOTIFY_URL format ok');
  }
}

function checkFrontendModes() {
  checkRequiredHttpsUrl('VITE_API_BASE_URL');
  checkRequiredHttpsUrl('TARO_APP_API_BASE_URL');

  if (value('TARO_APP_PAYMENT_MODE') !== 'real') {
    add('fail', 'TARO_APP_PAYMENT_MODE must be real');
  } else {
    add('pass', 'TARO_APP_PAYMENT_MODE=real');
  }
}

function checkOperationalConfirmations() {
  const confirmations = [
    ['DATABASE_BACKUP_CONFIRMED', 'database backup plan is confirmed'],
    [
      'LOG_RETENTION_CONFIRMED',
      'log directory, retention, and sensitive-data policy are confirmed',
    ],
    ['ERROR_MONITORING_CONFIRMED', 'error monitoring or alerting is confirmed'],
    ['ROLLBACK_PLAN_CONFIRMED', 'rollback plan is confirmed'],
  ] as const;

  for (const [name, message] of confirmations) {
    if (value(name) === '1') {
      add('pass', message);
    } else {
      add('warn', `${name}=1 not set; ${message}`);
    }
  }
}

function printResults() {
  const iconByStatus: Record<CheckStatus, string> = {
    fail: 'x',
    pass: 'ok',
    warn: 'warn',
  };

  console.log(`Deployment preflight started for ${target}`);

  for (const result of results) {
    console.log(`[${iconByStatus[result.status]}] ${result.message}`);
  }

  const failCount = results.filter((result) => result.status === 'fail').length;
  const warnCount = results.filter((result) => result.status === 'warn').length;

  console.log(`Deployment preflight finished: ${failCount} failed, ${warnCount} warnings.`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

checkProductionRuntime();
checkUploadStorage();
checkWechatModes();
checkFrontendModes();
checkOperationalConfirmations();
printResults();
