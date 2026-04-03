const prisma = require('./_prisma');
const { fromReq } = require('./_jwt');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
  const tokenData = fromReq(req);
  if (!tokenData) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method === 'GET') {
    const notifications = await prisma.notification.findMany({
      where: { toUserId: tokenData.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = notifications.filter(n => !n.read).length;
    return res.json({ notifications, unreadCount });
  }

  if (req.method === 'PUT') {
    await prisma.notification.updateMany({
      where: { toUserId: tokenData.userId, read: false },
      data: { read: true }
    });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[notifications.js]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
