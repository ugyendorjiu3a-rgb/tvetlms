// Local development seed data — NOT for production use. Creates the fixed 4-role set, one pilot
// institution/trade/module, and one login per role so `npm run start:dev` has something to log
// into immediately (see ../../README.md "First login" section for the printed credentials).
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Passw0rd!'; // same password for every seeded account, dev-only

async function main() {
  console.log('Seeding roles...');
  const roleNames = ['trainee', 'trainer', 'admin', 'exam_controller'] as const;
  const roles: Record<string, string> = {};
  for (const name of roleNames) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    roles[name] = role.id;
  }

  console.log('Seeding institution & trade...');
  const institution = await prisma.institution.upsert({
    where: { code: 'TTI-PILOT' },
    update: {},
    create: { name: 'Pilot Technical Training Institute', type: 'TTI', code: 'TTI-PILOT' },
  });

  const trade = await prisma.trade.upsert({
    where: { code: 'ELEC' },
    update: {},
    create: { code: 'ELEC', nameEn: 'Electrical Installation', nameDz: 'གློག་ཤོག་བཙུགས་བཞག' },
  });

  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });

  console.log('Seeding admin user...');
  const admin = await prisma.user.upsert({
    where: { loginId: 'admin' },
    update: {},
    create: {
      institutionId: institution.id,
      loginId: 'admin',
      email: 'admin@tvet-egateway.local',
      passwordHash,
      userRoles: { create: { roleId: roles.admin } },
    },
  });

  console.log('Seeding exam controller user...');
  await prisma.user.upsert({
    where: { loginId: 'examcontroller1' },
    update: {},
    create: {
      institutionId: institution.id,
      loginId: 'examcontroller1',
      email: 'examcontroller1@tvet-egateway.local',
      passwordHash,
      userRoles: { create: { roleId: roles.exam_controller } },
    },
  });

  console.log('Seeding trainer user + profile...');
  const trainer = await prisma.user.upsert({
    where: { loginId: 'trainer1' },
    update: {},
    create: {
      institutionId: institution.id,
      loginId: 'trainer1',
      email: 'trainer1@tvet-egateway.local',
      passwordHash,
      userRoles: { create: { roleId: roles.trainer } },
      trainerProfile: {
        create: { fullName: 'Sonam Wangdi', staffId: 'STAFF-0001', specialization: 'Electrical Installation' },
      },
    },
    include: { trainerProfile: true },
  });

  console.log('Seeding trainee user + profile...');
  const trainee = await prisma.user.upsert({
    where: { loginId: 'trainee1' },
    update: {},
    create: {
      institutionId: institution.id,
      loginId: 'trainee1',
      email: 'trainee1@tvet-egateway.local',
      passwordHash,
      userRoles: { create: { roleId: roles.trainee } },
      traineeProfile: {
        create: {
          fullName: 'Pema Choden',
          citizenshipId: 'CID-0001',
          tradeId: trade.id,
          enrollmentDate: new Date('2026-01-15'),
        },
      },
    },
    include: { traineeProfile: true },
  });

  console.log('Seeding a demo module + enrollment...');
  const trainerProfileId = trainer.trainerProfile!.userId;
  const traineeProfileId = trainee.traineeProfile!.userId;

  const module = await prisma.module.upsert({
    where: { code: 'ELEC-101' },
    update: {},
    create: {
      code: 'ELEC-101',
      nameEn: 'Basic Electrical Wiring',
      nameDz: 'གློག་ཤོག་སྦྲེལ་མཐུད་གཞི་རྩ།',
      ncsCode: 'NCS-ELEC-101',
      tradeId: trade.id,
      durationWeeks: 12,
      learningOutcome: 'Trainees can safely plan, install, and test basic residential wiring circuits.',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-04-30'),
      moduleTutorId: trainerProfileId,
    },
  });

  await prisma.moduleTrainer.upsert({
    where: { moduleId_trainerId: { moduleId: module.id, trainerId: trainerProfileId } },
    update: {},
    create: { moduleId: module.id, trainerId: trainerProfileId, roleLabel: 'tutor' },
  });

  await prisma.moduleTrainee.upsert({
    where: { moduleId_traineeId: { moduleId: module.id, traineeId: traineeProfileId } },
    update: {},
    create: { moduleId: module.id, traineeId: traineeProfileId, status: 'active' },
  });

  console.log('\nSeed complete. Login credentials (all use the same dev password):');
  console.table([
    { loginId: 'admin', role: 'admin', password: DEV_PASSWORD },
    { loginId: 'examcontroller1', role: 'exam_controller', password: DEV_PASSWORD },
    { loginId: 'trainer1', role: 'trainer', password: DEV_PASSWORD },
    { loginId: 'trainee1', role: 'trainee', password: DEV_PASSWORD },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
