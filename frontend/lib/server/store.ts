import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Application,
  Document,
  GeneratedPackage,
  Match,
  Notification,
  Profile,
  Reminder,
  SavedFilter,
  Vacancy,
  VacancyImportRun,
  VacancySource,
} from "@/types/api";

export type ActivityEntry = {
  date: string;
  matches_created: number;
  packages_generated: number;
};

export type Store = {
  profile: Profile;
  documents: Document[];
  vacancies: Vacancy[];
  matches: Match[];
  generated: GeneratedPackage[];
  applications: Application[];
  reminders: Reminder[];
  notifications: Notification[];
  filters: SavedFilter[];
  vacancySources: VacancySource[];
  importRuns: VacancyImportRun[];
  lastMatchingRunAt?: string | null;
  activity: ActivityEntry[];
  users: { id: string; email: string; created_at: string }[];
  shareLinks: { token: string; package_id: string; created_at: string }[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

let cachedStore: Store | null = null;

function nowIso() {
  return new Date().toISOString();
}

function defaultStore(): Store {
  const userId = randomUUID();
  return {
    profile: {
      id: randomUUID(),
      user_id: userId,
      full_name: null,
      location: null,
      desired_roles: [],
      skills: [],
      languages: {},
      salary_min: null,
      salary_max: null,
    },
    documents: [],
    vacancies: [],
    matches: [],
    generated: [],
    applications: [],
    reminders: [],
    notifications: [],
    filters: [],
    vacancySources: [],
    importRuns: [],
    lastMatchingRunAt: null,
    activity: [],
    users: [{ id: userId, email: "demo@careercopilot.ai", created_at: nowIso() }],
    shareLinks: [],
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getStore(): Promise<Store> {
  if (cachedStore) return cachedStore;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    cachedStore = JSON.parse(raw) as Store;
  } catch {
    cachedStore = defaultStore();
    await persistStore(cachedStore);
  }
  return cachedStore;
}

export async function persistStore(store: Store) {
  cachedStore = store;
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function updateStore<T>(mutator: (store: Store) => T | Promise<T>): Promise<T> {
  const store = await getStore();
  const result = await mutator(store);
  await persistStore(store);
  return result;
}

export function recordActivity(store: Store, entry: Partial<ActivityEntry> & { date: string }) {
  const existing = store.activity.find((item) => item.date === entry.date);
  if (existing) {
    existing.matches_created += entry.matches_created ?? 0;
    existing.packages_generated += entry.packages_generated ?? 0;
    return;
  }
  store.activity.push({
    date: entry.date,
    matches_created: entry.matches_created ?? 0,
    packages_generated: entry.packages_generated ?? 0,
  });
}

export function createId() {
  return randomUUID();
}

export function toIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function now() {
  return nowIso();
}
