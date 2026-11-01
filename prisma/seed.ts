import { PrismaClient } from '@prisma/client';
import { SEED_SUMMARY, seedDatabase } from './seedData.ts';

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then(() => {
    console.log(
      `Seeded ${SEED_SUMMARY.users} users, ${SEED_SUMMARY.applications} applications, ` +
        `${SEED_SUMMARY.institutes} institutes, ${SEED_SUMMARY.evcVisits} EVC visits, ` +
        `${SEED_SUMMARY.complianceRecords} compliance records, ${SEED_SUMMARY.documents} documents, ` +
        `${SEED_SUMMARY.undertakings} undertakings and ${SEED_SUMMARY.notifications} notifications.`
    );
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
