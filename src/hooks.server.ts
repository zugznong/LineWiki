import type { Handle } from '@sveltejs/kit';
import { SECURITY_HEADERS } from './lib/security/securityHeaders';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  
  return response;
};
