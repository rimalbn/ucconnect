module.exports = async function handler(req, res) {
  const info = {
    node: process.version,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 40) + '...)' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    }
  };

  try {
    const { neon } = require('@neondatabase/serverless');
    const { PrismaNeon } = require('@prisma/adapter-neon');
    const { PrismaClient } = require('@prisma/client');
    info.prismaClientImport = 'OK';
    try {
      const sql = neon(process.env.DATABASE_URL);
      const adapter = new PrismaNeon(sql);
      const p = new PrismaClient({ adapter });
      info.prismaClientNew = 'OK';
      await p.$queryRaw`SELECT 1`;
      info.dbConnection = 'OK';
    } catch (e) {
      info.dbConnection = 'ERROR: ' + e.message;
    }
  } catch (e) {
    info.prismaClientImport = 'ERROR: ' + e.message;
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(info);
};
