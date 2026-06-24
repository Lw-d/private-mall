import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { BadRequestException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { HttpJsonLogisticsProvider } from '../src/modules/logistics/http-json-logistics.provider';

type FakeMode = 'success' | 'invalid' | 'invalid-json' | 'unavailable';

interface RecordedRequest {
  authorization?: string;
  body: Record<string, unknown>;
  contentType?: string;
  method?: string;
  nonce?: string;
  signature?: string;
  signatureVersion?: string;
  timestamp?: string;
  url?: string;
}

const queryInput = {
  provider: 'http-json',
  logisticsCompany: '顺丰速运',
  logisticsCompanyCode: 'SF',
  trackingNo: 'SF1234567890',
  receiverPhoneTail: '0000',
  orderNo: 'MO20260618160000TEST01',
  afterSaleNo: null,
  shippedAt: new Date('2026-06-18T08:00:00.000Z'),
};

const validResponse = {
  status: 'IN_TRANSIT',
  queriedAt: '2026-06-18T08:30:00.000Z',
  traces: [
    {
      status: 'PICKED_UP',
      content: '快递员已揽收包裹',
      occurredAt: '2026-06-18T08:10:00.000Z',
    },
    {
      status: 'IN_TRANSIT',
      content: '包裹正在发往下一站',
      occurredAt: '2026-06-18T08:25:00.000Z',
    },
  ],
  rawPayload: {
    provider: 'local-fake-logistics',
  },
};

async function main() {
  const recordedRequests: RecordedRequest[] = [];
  let mode: FakeMode = 'success';

  const server = createServer(async (request, response) => {
    await handleRequest(request, response, () => mode, recordedRequests);
  });

  await listen(server);

  const address = server.address();
  assert(address && typeof address === 'object');

  const endpoint = `http://127.0.0.1:${address.port}/query`;
  const provider = new HttpJsonLogisticsProvider(
    createConfigService({
      LOGISTICS_HTTP_AUTH_TOKEN: 'local-smoke-token',
      LOGISTICS_HTTP_QUERY_URL: endpoint,
      LOGISTICS_HTTP_SIGNING_SECRET: 'local-signing-secret',
      LOGISTICS_HTTP_TIMEOUT_MS: 3000,
    }),
  );

  try {
    const result = await provider.query(queryInput);

    assert.equal(recordedRequests.length, 1);
    assert.equal(recordedRequests[0].method, 'POST');
    assert.equal(recordedRequests[0].url, '/query');
    assert.equal(recordedRequests[0].contentType, 'application/json');
    assert.equal(recordedRequests[0].authorization, 'Bearer local-smoke-token');
    assert.equal(recordedRequests[0].signatureVersion, 'hmac-sha256-v1');
    assert(recordedRequests[0].timestamp);
    assert(recordedRequests[0].nonce);
    assert.equal(
      recordedRequests[0].signature,
      createHmac('sha256', 'local-signing-secret')
        .update(
          `${recordedRequests[0].timestamp}.${recordedRequests[0].nonce}.${JSON.stringify(
            recordedRequests[0].body,
          )}`,
        )
        .digest('hex'),
    );
    assert.deepEqual(recordedRequests[0].body, {
      logisticsCompany: '顺丰速运',
      logisticsCompanyCode: 'SF',
      trackingNo: 'SF1234567890',
      receiverPhoneTail: '0000',
      orderNo: 'MO20260618160000TEST01',
      afterSaleNo: null,
    });

    assert.equal(result.status, 'IN_TRANSIT');
    assert.equal(result.traces.length, 2);
    assert.equal(result.traces[0].status, 'PICKED_UP');
    assert.equal(result.traces[1].content, '包裹正在发往下一站');
    assert.equal(result.queriedAt.toISOString(), '2026-06-18T08:30:00.000Z');
    assert.deepEqual(result.rawPayload, { provider: 'local-fake-logistics' });

    mode = 'unavailable';
    const unavailableRequestCount = recordedRequests.length;
    await expectProviderError(
      () => provider.query(queryInput),
      ServiceUnavailableException,
      'LOGISTICS_PROVIDER_HTTP_ERROR',
    );
    assert.equal(recordedRequests.length, unavailableRequestCount + 1);

    const retryingProvider = new HttpJsonLogisticsProvider(
      createConfigService({
        LOGISTICS_HTTP_QUERY_URL: endpoint,
        LOGISTICS_HTTP_RETRY_ATTEMPTS: 2,
        LOGISTICS_HTTP_RETRY_DELAY_MS: 0,
        LOGISTICS_HTTP_TIMEOUT_MS: 3000,
      }),
    );
    const retryRequestCount = recordedRequests.length;
    await expectProviderError(
      () => retryingProvider.query(queryInput),
      ServiceUnavailableException,
      'LOGISTICS_PROVIDER_HTTP_ERROR',
    );
    assert.equal(recordedRequests.length, retryRequestCount + 3);

    mode = 'invalid';
    const invalidRequestCount = recordedRequests.length;
    await expectProviderError(
      () => provider.query(queryInput),
      ServiceUnavailableException,
      'LOGISTICS_PROVIDER_NO_TRACES',
    );
    assert.equal(recordedRequests.length, invalidRequestCount + 1);

    mode = 'invalid-json';
    await expectProviderError(
      () => provider.query(queryInput),
      ServiceUnavailableException,
      'LOGISTICS_PROVIDER_INVALID_JSON',
    );

    const missingEndpointProvider = new HttpJsonLogisticsProvider(createConfigService({}));
    await expectProviderError(
      () => missingEndpointProvider.query(queryInput),
      BadRequestException,
      'LOGISTICS_PROVIDER_MISSING_ENDPOINT',
    );

    console.info('Smoke logistics provider passed.');
  } finally {
    await close(server);
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  getMode: () => FakeMode,
  recordedRequests: RecordedRequest[],
) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  recordedRequests.push({
    authorization: request.headers.authorization,
    body: rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {},
    contentType: request.headers['content-type'],
    method: request.method,
    nonce: getSingleHeader(request.headers['x-logistics-nonce']),
    signature: getSingleHeader(request.headers['x-logistics-signature']),
    signatureVersion: getSingleHeader(request.headers['x-logistics-signature-version']),
    timestamp: getSingleHeader(request.headers['x-logistics-timestamp']),
    url: request.url,
  });

  switch (getMode()) {
    case 'success':
      sendJson(response, 200, validResponse);
      return;
    case 'invalid':
      sendJson(response, 200, {
        status: 'UNKNOWN',
        traces: [],
      });
      return;
    case 'invalid-json':
      response.writeHead(200, {
        'Content-Type': 'application/json',
      });
      response.end('{invalid json');
      return;
    case 'unavailable':
      sendJson(response, 503, {
        message: 'provider temporarily unavailable',
      });
  }
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(body));
}

function createConfigService(values: Record<string, unknown>) {
  return {
    get(key: string) {
      return values[key];
    },
  } as ConfigService;
}

function getSingleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function expectProviderError(
  action: () => Promise<unknown>,
  ExceptionClass: typeof HttpException,
  code: string,
) {
  await assert.rejects(
    action,
    (error) =>
      error instanceof ExceptionClass && getProviderErrorCode(error.getResponse()) === code,
  );
}

function getProviderErrorCode(response: unknown) {
  if (typeof response !== 'object' || response === null || !('error' in response)) {
    return undefined;
  }

  const error = (response as { error?: unknown }).error;

  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return (error as { code?: unknown }).code;
}

async function listen(server: ReturnType<typeof createServer>) {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function close(server: ReturnType<typeof createServer>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
