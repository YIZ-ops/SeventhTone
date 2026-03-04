import { Capacitor, CapacitorHttp } from '@capacitor/core';

const isNative = () => {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  return Capacitor.isNativePlatform() || protocol === 'capacitor:' || protocol === 'file:';
};

const parseAsJsonOrThrowHtml = <T>(payload: unknown, contentType?: string | null): T => {
  if (typeof payload === 'string') {
    const text = payload.trim();
    const appearsJson = text.startsWith('{') || text.startsWith('[');
    if (appearsJson || (contentType && contentType.includes('application/json'))) {
      return JSON.parse(text) as T;
    }
    if (text.startsWith('<!doctype html') || text.startsWith('<html')) {
      throw new Error('Received HTML instead of JSON. This usually means a routing error or missing backend.');
    }
    return payload as T;
  }
  return payload as T;
};

export const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const method = options?.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  try {
    if (isNative()) {
      let data: unknown = undefined;
      if (options?.body !== undefined && options?.body !== null) {
        if (typeof options.body === 'string') {
          try {
            data = JSON.parse(options.body);
          } catch {
            data = options.body;
          }
        } else {
          data = options.body as unknown;
        }
      }

      const response = await CapacitorHttp.request({
        url,
        method,
        headers,
        data,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = (response.headers?.['content-type'] || response.headers?.['Content-Type']) as
        | string
        | undefined;
      return parseAsJsonOrThrowHtml<T>(response.data, contentType);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data as T;
    }

    const text = await response.text();
    return parseAsJsonOrThrowHtml<T>(text, contentType);
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};
