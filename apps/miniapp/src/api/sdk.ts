import { createMiniappApi, type DataApiRequestOptions } from '@mall/api-sdk';

import { request } from '../lib/request';

export const miniappApi = createMiniappApi({
  request: (path: string, options?: DataApiRequestOptions) =>
    request(path, {
      method: options?.method,
      data: options?.data,
    }),
});
