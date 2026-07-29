// src/app/interceptors/no-retry.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor that prevents browser-level retries for upload requests.
 * This is critical for large file uploads that take time to process.
 */
export const noRetryInterceptor: HttpInterceptorFn = (req, next) => {
  // ✅ Mark the request to prevent retries
  // Clone the request with headers that discourage retries
  const newReq = req.clone({
    setHeaders: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });

  // ✅ Pass through to the next interceptor
  return next(newReq);
};