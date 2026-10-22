const crypto = require('crypto');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Checking Somi Godmode account status...');
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    console.log('Database is empty. Running full seed...');
    require('../prisma/seed.js');
    return;
  }

  const passwordHash = hashPassword('Mezon13!');
  const somi = await prisma.user.upsert({
    where: { email: 'somi@mezon.uz' },
    update: {
      username: 'somi',
      passwordHash,
      role: Role.ADMIN,
      fullName: 'Somi (Founder · Godmode)',
    },
    create: {
      username: 'somi',
      email: 'somi@mezon.uz',
      passwordHash,
      role: Role.ADMIN,
      fullName: 'Somi (Founder · Godmode)',
    },
  });

  console.log(`Godmode account ready: ${somi.username} (${somi.email}), role: ${somi.role}`);
}

main()
  .catch((e) => {
    console.error('ensure-admin failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
