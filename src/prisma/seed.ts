import { randAvatar, randFullAddress, randPastDate, randPhoneNumber } from '@ngneat/falso'
import type { Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'

import { batchPrimaryLog, errorLog, getCurrentTime } from '@/shared'

const prisma = new PrismaClient()

const CURRENT_DATE = new Date().toISOString()
const SEED_USER = 'Admin'

const defaultUser: Prisma.UserCreateInput = {
  username: 'Admin',
  password: '$2b$10$kZEDiHCgDhFmX7/sKwYm1ORMK99FNk/QQgebcwBflKrAWKGA.D46W',
  name: 'Admin',
  phoneNumber: randPhoneNumber(),
  birthDate: randPastDate(),
  address: randFullAddress(),
  avatarUrl: randAvatar(),
  verified: true,
  enabled: true,
  roles: [],
  createdAt: CURRENT_DATE,
  createdBy: SEED_USER
}

const seed = async () => {
  await prisma.user.create({
    data: defaultUser
  })
}

seed()
  .then(async () => {
    batchPrimaryLog([
      `[prisma - ${getCurrentTime('HH:mm:ss')}] 🍀 Seed your db successfully!`,
      `[prisma - ${getCurrentTime('HH:mm:ss')}] 🔒 Created the default user: ${defaultUser.username}`
    ])
  })
  .catch(async (e) => {
    errorLog(`[prisma - ${getCurrentTime('HH:mm:ss')}] 🐞 Error occurred when seed your db!`)
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
