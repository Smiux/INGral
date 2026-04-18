import { createClient } from '@libsql/client';

const url = import.meta.env.VITE_TURSO_DATABASE_URL || 'file:local.db';
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

export const turso = createClient({
  url,
  ...(authToken && { authToken })
});
