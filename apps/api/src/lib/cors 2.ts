/**
 * Dynamic CORS allowlist: dev allows local Next app origins; prod uses env.
 * No wildcard when credentials is true. Origin function echoes request origin when allowed.
 */

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://localhost:3012',
  'http://127.0.0.1:3012',
  'http://127.0.0.1:3002',
];

export function getCorsAllowlist(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    return DEV_ORIGINS;
  }
  const instructor = process.env.INSTRUCTOR_APP_ORIGIN?.trim();
  const admin = process.env.ADMIN_APP_ORIGIN?.trim();
  if (!instructor || !admin) {
    const missing: string[] = [];
    if (!instructor) missing.push('INSTRUCTOR_APP_ORIGIN');
    if (!admin) missing.push('ADMIN_APP_ORIGIN');
    throw new Error(
      `CORS: in production set ${missing.join(' and ')}. Example: INSTRUCTOR_APP_ORIGIN=https://instructor.example.com ADMIN_APP_ORIGIN=https://admin.example.com`
    );
  }
  const extra = process.env.EXTRA_ALLOWED_ORIGINS?.trim();
  const list = [instructor, admin];
  if (extra) {
    extra.split(',').forEach((o) => {
      const t = o.trim();
      if (t) list.push(t);
    });
  }
  return list;
}

export function getCorsOptionsFromList(allowlist: string[]): {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean | string) => void) => void;
  credentials: boolean;
  allowedHeaders: string[];
  methods: string[];
} {
  return {
    origin(origin: string | undefined, cb: (err: Error | null, allow: boolean | string) => void) {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (allowlist.includes(origin)) {
        cb(null, origin);
        return;
      }
      cb(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };
}
