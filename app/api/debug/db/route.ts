import { NextResponse } from 'next/server'
import path from 'path'
import Database from 'better-sqlite3'

export async function GET() {
  const dbPath = path.resolve(process.cwd(), 'tasks.db')
  const db = new Database(dbPath)

  const countRow = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as {
    count: number
  }

  const tasks = db.prepare('SELECT id, title FROM tasks').all()

  return NextResponse.json({
    dbPath,
    tasksCount: countRow.count,
    tasks,
  })
}
