import type { ReactNode } from 'react';

interface AppMessageApi {
  error: (content: ReactNode) => void;
  success: (content: ReactNode) => void;
}

let currentMessageApi: AppMessageApi | undefined;

export function bindAppMessage(api: AppMessageApi) {
  currentMessageApi = api;

  return () => {
    if (currentMessageApi === api) {
      currentMessageApi = undefined;
    }
  };
}

export const appMessage: AppMessageApi = {
  error(content) {
    currentMessageApi?.error(content);
  },
  success(content) {
    currentMessageApi?.success(content);
  },
};
