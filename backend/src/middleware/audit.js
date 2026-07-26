import { pool } from '../db.js';

export async function logAudit({ userId, username, fullName, action, module, resourceType, resourceId, resourceName, details, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, full_name, action, module, resource_type, resource_id, resource_name, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [userId ?? null, username ?? null, fullName ?? null, action, module ?? null,
       resourceType ?? null, resourceId ? String(resourceId) : null,
       resourceName ?? null, details ? JSON.stringify(details) : null, ip ?? null]
    );
  } catch (err) {
    console.error('[audit] failed to write log:', err.message);
  }
}

// Express middleware: auto-logs mutating requests after response is sent
export function auditMiddleware(module) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      originalJson(body);
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400) {
        const actionMap = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };
        const action = actionMap[req.method];
        const user = req.user;
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
        const resourceId = req.params?.id || body?.id || body?.data?.id || null;
        const resourceName = body?.name || body?.full_name || body?.data?.name || null;
        logAudit({
          userId: user?.userId,
          username: user?.username,
          fullName: user?.full_name || user?.fullName,
          action,
          module,
          resourceType: module,
          resourceId,
          resourceName,
          details: { method: req.method, path: req.path, body: req.body },
          ip,
        });
      }
    };
    next();
  };
}
