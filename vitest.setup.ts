import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Throwaway SQLite database. Prisma resolves relative SQLite paths against the
// prisma/ folder, so this is prisma/test.db (git-ignored via /prisma/**/*.db).
export const TEST_DATABASE_URL = 'file:./test.db'
const prismaDir = path.resolve(__dirname, 'prisma')

const removeTestDb = () => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    fs.rmSync(path.join(prismaDir, `test.db${suffix}`), { force: true })
  }
}

export default function setup() {
  process.env.DATABASE_URL = TEST_DATABASE_URL
  removeTestDb()
  execSync('npx prisma migrate deploy', {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  })
  return removeTestDb
}
