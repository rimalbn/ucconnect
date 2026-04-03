const prisma = require('./_prisma');
const { fromReq } = require('./_jwt');

function formatPost(p, tokenData, followingIds) {
  return {
    id: p.id,
    content: p.content,
    photoUrl: p.photoUrl,
    createdAt: p.createdAt,
    authorId: p.author.id,
    author: p.author.name,
    username: p.author.username,
    dept: p.author.major || 'Student',
    avatarColor: p.author.avatarColor,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    isLiked: p.likes.length > 0,
    isBookmarked: p.bookmarks.length > 0,
    isFollowing: followingIds.has(p.author.id),
    isMyPost: p.author.id === tokenData.userId,
    comments: (p.comments || []).map(c => ({
      id: c.id,
      author: c.author.name,
      avatarColor: c.author.avatarColor,
      content: c.content,
      createdAt: c.createdAt
    }))
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
  const tokenData = fromReq(req);
  if (!tokenData) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method === 'GET') {
    const follows = await prisma.follow.findMany({
      where: { followerId: tokenData.userId },
      select: { followingId: true }
    });
    const followingIds = new Set(follows.map(f => f.followingId));

    if (followingIds.size === 0) return res.json({ posts: [] });

    const posts = await prisma.post.findMany({
      where: { authorId: { in: [...followingIds] } },
      include: {
        author: { select: { id: true, name: true, username: true, major: true, avatarColor: true } },
        likes: { where: { userId: tokenData.userId } },
        bookmarks: { where: { userId: tokenData.userId } },
        comments: {
          include: { author: { select: { id: true, name: true, avatarColor: true } } },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ posts: posts.map(p => formatPost(p, tokenData, followingIds)) });
  }

  if (req.method === 'POST') {
    const { userId: followingId } = req.body;
    if (!followingId) return res.status(400).json({ error: 'userId is required.' });
    if (followingId === tokenData.userId) return res.status(400).json({ error: 'Cannot follow yourself.' });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: tokenData.userId, followingId } }
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
    } else {
      await prisma.follow.create({ data: { followerId: tokenData.userId, followingId } });
    }

    return res.json({ following: !existing });
  }

  return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[follow.js]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
