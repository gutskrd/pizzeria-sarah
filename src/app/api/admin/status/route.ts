import { getAdminStatus } from '@/lib/admin/status';
import { getCurrentSession } from '@/lib/auth/current';

/** Live notification status for the admin (polled by the browser). */
export async function GET() {
  const ctx = await getCurrentSession();
  if (!ctx) return Response.json({ ok: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ ok: true, data: await getAdminStatus(ctx.user.id) }, { headers: { 'Cache-Control': 'no-store' } });
}
