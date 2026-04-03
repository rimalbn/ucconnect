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
    isLiked: tokenData ? p.likes.length > 0 : false,
    isBookmarked: tokenData ? p.bookmarks.length > 0 : false,
    isFollowing: tokenData ? (followingIds instanceof Set ? followingIds.has(p.author.id) : false) : false,
    isMyPost: tokenData ? p.author.id === tokenData.userId : false,
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

  const tokenData = fromReq(req);

  if (req.method === 'GET') {
    const { dept } = req.query;
    const where = dept ? { author: { major: dept } } : {};

    const includeBlock = {
      author: { select: { id: true, name: true, username: true, major: true, avatarColor: true } },
      comments: {
        include: { author: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { createdAt: 'asc' }
      },
      _count: { select: { likes: true, comments: true } }
    };

    if (tokenData) {
      includeBlock.likes = { where: { userId: tokenData.userId } };
      includeBlock.bookmarks = { where: { userId: tokenData.userId } };
    } else {
      includeBlock.likes = false;
      includeBlock.bookmarks = false;
    }

    const posts = await prisma.post.findMany({
      where,
      include: includeBlock,
      orderBy: { createdAt: 'desc' }
    });

    let followingIds = new Set();
    if (tokenData) {
      const follows = await prisma.follow.findMany({
        where: { followerId: tokenData.userId },
        select: { followingId: true }
      });
      followingIds = new Set(follows.map(f => f.followingId));
    }

    return res.json({ posts: posts.map(p => formatPost(p, tokenData, followingIds)) });
  }

  if (req.method === 'POST') {
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated' });
    const { content, photoUrl } = req.body;
    if (!content && !photoUrl) return res.status(400).json({ error: 'Content or photo is required.' });

    const post = await prisma.post.create({
      data: {
        content: content || null,
        photoUrl: photoUrl || null,
        authorId: tokenData.userId
      },
      include: {
        author: { select: { id: true, name: true, username: true, major: true, avatarColor: true } },
        comments: { include: { author: { select: { id: true, name: true, avatarColor: true } } } },
        _count: { select: { likes: true, comments: true } }
      }
    });

    post.likes = [];
    post.bookmarks = [];

    return res.json({ post: formatPost(post, tokenData, new Set()) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
