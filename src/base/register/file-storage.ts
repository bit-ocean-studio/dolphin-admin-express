import fs from 'fs'

import { primaryLog } from '@/utils'

const fileStorageRegister = (storageFolder: string) => {
  // Create file storage folder if not exists
  try {
    fs.accessSync(storageFolder)
  } catch (e) {
    fs.mkdirSync(storageFolder, { recursive: true })
    primaryLog('[File Storage] File storage folder created.')
  }
}

export default fileStorageRegister
