/**
 * MEZON SPRINT OS - PRODUCTION SYNCHRONIZATION CLI
 * 
 * SAFETY NOTICE:
 * This script interacts with a live production or staging server.
 * To prevent accidental data loss, execution requires explicit CLI confirmation flags.
 * 
 * Usage:
 *   node scripts/sync_students.js \
 *     --target-url=https://diary.mezon.uz \
 *     --admin-password="<ADMIN_PASSWORD>" \
 *     --confirm-production-wipe-and-sync
 */

const crypto = require('crypto');

function generateSecurePassword(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Mz!${prefix.slice(0, 4).toLowerCase()}${rand}`;
}

const students = [
  // 8 класс
  { fullName: 'Мустапаев Искандер', username: 'iskander', gradeLevel: 8, email: 'iskander@mezon.uz' },
  { fullName: 'Носирова Мехрибону', username: 'mehribonu', gradeLevel: 8, email: 'mehribonu@mezon.uz' },
  { fullName: 'Рахимбердиев Хуршид', username: 'khurshid', gradeLevel: 8, email: 'khurshid@mezon.uz' },
  { fullName: 'Туляганов Мухаммадали', username: 'muhammadali', gradeLevel: 8, email: 'muhammadali@mezon.uz' },
  { fullName: 'Шомуродова Зебунисо', username: 'zebuniso', gradeLevel: 8, email: 'zebuniso@mezon.uz' },
  { fullName: 'Эльвишаи Камаль', username: 'kamal', gradeLevel: 8, email: 'kamal@mezon.uz' },
  // 9 класс
  { fullName: 'Бахромов Феруз', username: 'feruz', gradeLevel: 9, email: 'feruz@mezon.uz' },
  { fullName: 'Курбонова Сафия', username: 'safiya', gradeLevel: 9, email: 'safiya@mezon.uz' },
  { fullName: 'Мухамедов Батырхан', username: 'batyrkhan', gradeLevel: 9, email: 'batyrkhan@mezon.uz' },
  { fullName: 'Саъдуллаева Маржона', username: 'marjona', gradeLevel: 9, email: 'marjona@mezon.uz' },
  { fullName: 'Турсунова Халида', username: 'khalida', gradeLevel: 9, email: 'khalida@mezon.uz' },
  { fullName: 'Хикматуллаев Абдуворис', username: 'abduvoris', gradeLevel: 9, email: 'abduvoris@mezon.uz' },
];

async function run() {
  const args = process.argv.slice(2);
  const confirmed = args.includes('--confirm-production-wipe-and-sync');
  const targetArg = args.find((a) => a.startsWith('--target-url='));
  const passwordArg = args.find((a) => a.startsWith('--admin-password='));

  const targetUrl = (targetArg ? targetArg.split('=')[1] : process.env.TARGET_URL || 'https://diary.mezon.uz').replace(/\/+$/, '');
  const adminPassword = passwordArg ? passwordArg.split('=')[1] : process.env.ADMIN_PASSWORD;

  if (!confirmed) {
    console.error('\n[SAFETY LOCK ENGAGED]');
    console.error('This script wipes non-admin users and resets cohort state on the target server.');
    console.error('To proceed, you MUST provide the explicit confirmation flag:');
    console.error('  --confirm-production-wipe-and-sync');
    console.error('\nExample:');
    console.error(`  node scripts/sync_students.js --target-url=${targetUrl} --admin-password="***" --confirm-production-wipe-and-sync\n`);
    process.exit(1);
  }

  if (!adminPassword) {
    console.error('\n[AUTHENTICATION REQUIRED]');
    console.error('Please specify the admin password via --admin-password="..." or ADMIN_PASSWORD env variable.\n');
    process.exit(1);
  }

  console.log(`Connecting to ${targetUrl} as somi...`);
  const loginRes = await fetch(`${targetUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'somi', password: adminPassword }),
  });

  if (!loginRes.ok) {
    throw new Error('Admin authentication failed: ' + loginRes.status + ' ' + (await loginRes.text()));
  }

  const cookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  const cookieHeader = cookies.filter(Boolean).map((c) => c.split(';')[0]).join('; ');

  // Fetch current users
  const usersRes = await fetch(`${targetUrl}/api/v1/admin/users`, {
    headers: { cookie: cookieHeader },
  });
  const usersData = await usersRes.json();
  const currentUsers = usersData.users || [];
  console.log('Current accounts count on target:', currentUsers.length);

  // 1. Delete old accounts (except admin)
  for (const user of currentUsers) {
    if (user.role === 'ADMIN' || user.username === 'somi') {
      console.log(`Preserving admin: ${user.fullName} (@${user.username})`);
      continue;
    }
    console.log(`Deleting previous user ${user.fullName} (@${user.username}, id: ${user.id})...`);
    await fetch(`${targetUrl}/api/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { cookie: cookieHeader },
    });
  }

  // 2. Register fresh cohort with secure passwords
  console.log('\nRegistering fresh students cohort...');
  for (const s of students) {
    const studentPassword = generateSecurePassword(s.username);
    console.log(`Registering student: ${s.fullName} (@${s.username}, ${s.gradeLevel} класс)...`);
    const regRes = await fetch(`${targetUrl}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        fullName: s.fullName,
        username: s.username,
        email: s.email,
        password: studentPassword,
        role: 'STUDENT',
        gradeLevel: s.gradeLevel,
      }),
    });

    if (!regRes.ok) {
      console.error(`Failed to register ${s.username}:`, await regRes.text());
    } else {
      console.log(`✓ Registered ${s.username}`);
    }
  }

  console.log('\n✓ Synchronization completed safely.');
}

run().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
