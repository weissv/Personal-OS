const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generatePassword(prefix) {
  // 10 chars: e.g. Mz! + 3 chars prefix + 4 random digits/letters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
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

students.forEach(s => {
  s.password = generatePassword(s.username);
});

// Write CSV
const csvRows = ['№,Класс,ФИО,Юзернейм,Пароль,Email,Роль'];
students.forEach((s, idx) => {
  csvRows.push(`${idx + 1},${s.gradeLevel} класс,"${s.fullName}",${s.username},${s.password},${s.email},STUDENT`);
});

const csvPath = path.join(process.cwd(), 'students_credentials.csv');
fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\r\n'), 'utf8');
console.log('Saved CSV to:', csvPath);

async function run() {
  console.log('Logging in to production https://diary.mezon.uz as somi...');
  const loginRes = await fetch('https://diary.mezon.uz/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'somi', password: 'Mezon13!' })
  });

  if (!loginRes.ok) {
    throw new Error('Login failed: ' + loginRes.status + ' ' + (await loginRes.text()));
  }

  const cookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

  // Get current users
  const usersRes = await fetch('https://diary.mezon.uz/api/v1/admin/users', {
    headers: { 'cookie': cookieHeader }
  });
  const usersData = await usersRes.json();
  const currentUsers = usersData.users || [];
  console.log('Current users on server:', currentUsers.map(u => `${u.username} (${u.role})`));

  // 1. Delete all users except somi
  for (const user of currentUsers) {
    if (user.username === 'somi') {
      console.log('Skipping somi (admin)');
      continue;
    }
    console.log(`Deleting ${user.fullName} (@${user.username}, id: ${user.id})...`);
    const delRes = await fetch(`https://diary.mezon.uz/api/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { 'cookie': cookieHeader }
    });
    const delData = await delRes.json();
    console.log('Delete result:', delData);
  }

  // 2. Add each student
  for (const s of students) {
    console.log(`Registering student ${s.fullName} (@${s.username}, ${s.gradeLevel} класс)...`);
    const regRes = await fetch('https://diary.mezon.uz/api/v1/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cookie': cookieHeader
      },
      body: JSON.stringify({
        fullName: s.fullName,
        username: s.username,
        email: s.email,
        password: s.password,
        role: 'STUDENT',
        gradeLevel: s.gradeLevel,
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok) {
      console.error(`Failed to register ${s.username}:`, regData);
    } else {
      console.log(`Successfully registered ${s.username}! ID: ${regData.user.id}`);
    }
  }

  // Verify final list
  const finalRes = await fetch('https://diary.mezon.uz/api/v1/admin/users', {
    headers: { 'cookie': cookieHeader }
  });
  const finalData = await finalRes.json();
  console.log('\n--- FINAL USERS LIST ON PRODUCTION ---');
  console.log('Total users:', finalData.users ? finalData.users.length : 0);
  finalData.users.forEach(u => {
    console.log(`- ${u.fullName} | @${u.username} | ${u.role} | класс ${u.gradeLevel || '-'} | спринтов: ${u.sprintsCount}`);
  });
}

run().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
