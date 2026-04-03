module.exports = async function handler(req, res) {
  const info = {
    node: process.version,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 40) + '...)' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    }
  };

  try {
    const { PrismaClient } = require('@prisma/client');
    info.prismaClientImport = 'OK';
    try {
      const p = new PrismaClient();
      await p.$queryRaw`SELECT 1`;
      info.dbConnection = 'OK';
      await p.$disconnect();
    } catch (e) {
      info.dbConnection = 'ERROR: ' + e.message;
    }
  } catch (e) {
    info.prismaClientImport = 'ERROR: ' + e.message;
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(info);
};
