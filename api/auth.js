const prisma = require('./_prisma');
const { sign, fromReq } = require('./_jwt');
const bcrypt = require('bcryptjs');

function safeUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/auth → return current user from JWT
  if (req.method === 'GET') {
    const tokenData = fromReq(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated' });
    const user = await prisma.user.findUnique({ where: { id: tokenData.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: safeUser(user) });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body || {};

  if (action === 'signup') {
    const { name, username, email, password, major, year } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (exists) {
      if (exists.email === email) return res.status(400).json({ error: 'That email is already registered.' });
      return res.status(400).json({ error: 'That username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        major: major || null,
        year: year || null
      }
    });

    const token = sign({ userId: user.id });
    return res.json({ token, user: safeUser(user) });
  }

  if (action === 'login') {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = sign({ userId: user.id });
    return res.json({ token, user: safeUser(user) });
  }

  return res.status(400).json({ error: 'Unknown action.' });
};
