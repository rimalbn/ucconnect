const prisma = require('./_prisma');
const { fromReq } = require('./_jwt');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
  const tokenData = fromReq(req);
  if (!tokenData) return res.status(401).json({ error: 'Not authenticated' });

  const { postId } = req.body;
  if (!postId) return res.status(400).json({ error: 'postId is required.' });

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: tokenData.userId, postId } }
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId: tokenData.userId, postId } });

    // Notify post author (not self)
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, content: true }
    });
    if (post && post.authorId !== tokenData.userId) {
      const from = await prisma.user.findUnique({
        where: { id: tokenData.userId },
        select: { name: true, avatarColor: true }
      });
      await prisma.notification.create({
        data: {
          type: 'like',
          fromName: from.name,
          fromAvatarColor: from.avatarColor,
          postSnippet: (post.content || '').substring(0, 60),
          toUserId: post.authorId,
          postId
        }
      });
    }
  }

  const count = await prisma.like.count({ where: { postId } });
  return res.json({ liked: !existing, count });
  } catch (err) {
    console.error('[like.js]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
