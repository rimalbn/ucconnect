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

  const { postId, content } = req.body;
  if (!postId || !content) return res.status(400).json({ error: 'postId and content are required.' });

  const comment = await prisma.comment.create({
    data: { postId, authorId: tokenData.userId, content },
    include: { author: { select: { id: true, name: true, avatarColor: true } } }
  });

  // Notify post author (not self)
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, content: true }
  });
  if (post && post.authorId !== tokenData.userId) {
    await prisma.notification.create({
      data: {
        type: 'comment',
        fromName: comment.author.name,
        fromAvatarColor: comment.author.avatarColor,
        postSnippet: (post.content || '').substring(0, 60),
        toUserId: post.authorId,
        postId
      }
    });
  }

  return res.json({
    comment: {
      id: comment.id,
      author: comment.author.name,
      avatarColor: comment.author.avatarColor,
      content: comment.content,
      createdAt: comment.createdAt
    }
  });
  } catch (err) {
    console.error('[comment.js]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
