const prisma = require('./_prisma');
const { fromReq } = require('./_jwt');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const tokenData = fromReq(req);
  if (!tokenData) return res.status(401).json({ error: 'Not authenticated' });

  const { name, username, bio, major, year, avatarColor } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  // Check username uniqueness
  if (username) {
    const conflict = await prisma.user.findFirst({
      where: { username, NOT: { id: tokenData.userId } }
    });
    if (conflict) return res.status(400).json({ error: 'Username already taken.' });
  }

  const updated = await prisma.user.update({
    where: { id: tokenData.userId },
    data: {
      name,
      username: username || undefined,
      bio: bio || null,
      major: major || null,
      year: year || null,
      avatarColor: avatarColor || undefined
    }
  });

  const { passwordHash, ...safe } = updated;
  return res.json({ user: safe });
};
