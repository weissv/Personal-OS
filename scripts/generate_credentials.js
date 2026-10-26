/**
 * MEZON SPRINT OS - COHORT CREDENTIALS GENERATOR
 * Generates secure, randomized credentials for a student cohort.
 * Output is formatted as a CSV and can be saved to an uncommitted file or standard output.
 * 
 * Usage:
 *   node scripts/generate_credentials.js
 *   node scripts/generate_credentials.js --out=cohort_2026_passwords.csv
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateStrongPassword(prefix = 'Mz') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let rand = '';
  for (let i = 0; i < 7; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}!${rand}`;
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

const curators = [
  { fullName: 'Тамилла', username: 'tamilla', gradeLevel: 8, email: 'tamilla@mezon.uz', role: 'MENTOR' },
  { fullName: 'Феруза', username: 'feruza', gradeLevel: 9, email: 'feruza@mezon.uz', role: 'MENTOR' },
];

const rows = [
  '№,Роль,Класс,ФИО,Юзернейм,Пароль,Email',
];

let idx = 1;

// Curators
curators.forEach((c) => {
  const pwd = generateStrongPassword(c.username.slice(0, 4));
  rows.push(`${idx},MENTOR,${c.gradeLevel} класс,"${c.fullName}",${c.username},${pwd},${c.email}`);
  idx++;
});

// Students
students.forEach((s) => {
  const pwd = generateStrongPassword(s.username.slice(0, 4));
  rows.push(`${idx},STUDENT,${s.gradeLevel} класс,"${s.fullName}",${s.username},${pwd},${s.email}`);
  idx++;
});

const csvContent = '\uFEFF' + rows.join('\r\n');

const outArg = process.argv.find((a) => a.startsWith('--out='));
if (outArg) {
  const outFile = outArg.split('=')[1];
  fs.writeFileSync(path.resolve(process.cwd(), outFile), csvContent, 'utf8');
  console.log(`✓ Wrote ${rows.length - 1} credentials to ${outFile}`);
} else {
  console.log(csvContent);
  console.log('\n[INFO] To save to a local gitignored file, use: node scripts/generate_credentials.js --out=cohort.csv');
}
