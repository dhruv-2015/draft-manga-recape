import fs from "node:fs"
import path from "node:path"

const DOCS_DIR = path.join(process.cwd(), "docs")

export function getDoc(page: string): string | null {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, `${page}.md`), "utf-8")
  } catch {
    return null
  }
}

export function listDocs(): string[] {
  try {
    return fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3))
  } catch {
    return []
  }
}
