import { PrismaClient } from '@prisma/client';
import { SEED_SUMMARY, seedDatabase } from './seedData.ts';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Seeds only an empty database so a container restart never overwrites live edits.
  const existing = await prisma.user.count();
  if (existing > 0 && process.env.SEED_FORCE !== '1') {
    console.log(`Seed skipped: ${existing} user(s) already present. Set SEED_FORCE=1 to overwrite.`);
    return;
  }

  await seedDatabase(prisma);
  console.log(
    `Seeded ${SEED_SUMMARY.users} users, ${SEED_SUMMARY.applications} applications, ` +
      `${SEED_SUMMARY.institutes} institutes, ${SEED_SUMMARY.evcVisits} EVC visits, ` +
      `${SEED_SUMMARY.complianceRecords} compliance records, ${SEED_SUMMARY.documents} documents, ` +
      `${SEED_SUMMARY.undertakings} undertakings and ${SEED_SUMMARY.notifications} notifications.`
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
