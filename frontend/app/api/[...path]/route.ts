import type { NextRequest } from "next/server";
import {
  createId,
  getStore,
  now,
  recordActivity,
  toIsoDate,
  updateStore,
} from "@/lib/server/store";
import { buildMatch, buildMatches } from "@/lib/server/matching";
import type {
  Application,
  Document,
  GeneratedPackage,
  Match,
  MatchDetail,
  Profile,
  Reminder,
  SavedFilter,
  Vacancy,
  VacancyImportRun,
  VacancySource,
} from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function error(message: string, status = 400, code?: string, details?: unknown) {
  return json({ message, code, details }, status);
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return {
    items: paged,
    total,
    page,
    page_size: pageSize,
  };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      current.push(field);
      field = "";
      continue;
    }
    if (char === "\n" && !inQuotes) {
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      continue;
    }
    if (char === "\r") {
      continue;
    }
    field += char;
  }
  if (field.length || current.length) {
    current.push(field);
    rows.push(current);
  }
  return rows.filter((row) => row.some((cell) => cell.trim().length));
}

function normalizeQuery(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function matchQuery(value: string | null | undefined, query: string) {
  if (!query) return true;
  return (value ?? "").toLowerCase().includes(query);
}

async function handleAuth(segments: string[], request: NextRequest) {
  const action = segments[1];
  if (request.method !== "POST") {
    return error("Method not allowed", 405);
  }
  const body = await request.json().catch(() => ({}));
  const email = (body.email as string | undefined) ?? "demo@careercopilot.ai";

  if (action === "register" || action === "login") {
    await updateStore((store) => {
      if (!store.users.find((user) => user.email === email)) {
        store.users.push({ id: createId(), email, created_at: now() });
      }
    });
    return json({ access_token: createId(), refresh_token: createId() });
  }
  if (action === "refresh") {
    return json({ access_token: createId(), refresh_token: createId() });
  }
  return error("Not found", 404);
}

async function handleProfile(request: NextRequest) {
  if (request.method === "GET") {
    const store = await getStore();
    return json(store.profile);
  }
  if (request.method === "PUT") {
    const payload = (await request.json().catch(() => ({}))) as Partial<Profile>;
    const updated = await updateStore((store) => {
      store.profile = {
        ...store.profile,
        ...payload,
        desired_roles: payload.desired_roles ?? store.profile.desired_roles,
        skills: payload.skills ?? store.profile.skills,
        languages: payload.languages ?? store.profile.languages,
      };
      return store.profile;
    });
    return json(updated);
  }
  return error("Method not allowed", 405);
}

async function handleDocuments(segments: string[], request: NextRequest) {
  const docId = segments[2];
  const action = segments[3];
  if (!docId) {
    if (request.method === "GET") {
      const store = await getStore();
      return json(store.documents);
    }
    return error("Not found", 404);
  }
  if (action === "reparse" && request.method === "POST") {
    const updated = await updateStore((store) => {
      const doc = store.documents.find((item) => item.id === docId);
      if (!doc) {
        return null;
      }
      doc.status = "processed";
      doc.failure_reason = null;
      doc.text_extracted = doc.text_extracted ?? "Reparsed document.";
      return doc;
    });
    if (!updated) {
      return error("Document not found", 404);
    }
    return json(updated);
  }
  if (request.method === "GET") {
    const store = await getStore();
    const doc = store.documents.find((item) => item.id === docId);
    if (!doc) return error("Document not found", 404);
    return json(doc);
  }
  return error("Method not allowed", 405);
}

async function handleDocumentUpload(request: NextRequest) {
  if (request.method !== "POST") {
    return error("Method not allowed", 405);
  }
  const formData = await request.formData();
  const kind = String(formData.get("kind") ?? "resume");
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return error("Missing file", 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return error("File too large", 413, "DOC_TOO_LARGE");
  }
  if (
    ![
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.type)
  ) {
    return error("Unsupported file", 415, "UNSUPPORTED_FILE");
  }
  const text = file.type === "application/pdf" ? `PDF upload: ${file.name}` : `DOCX upload: ${file.name}`;
  const document: Document = {
    id: createId(),
    kind: kind as Document["kind"],
    s3_key: file.name,
    text_extracted: text,
    extracted_json: { filename: file.name },
    status: "processed",
    failure_reason: null,
  };
  await updateStore((store) => {
    store.documents.unshift(document);
    store.notifications.unshift({
      id: createId(),
      type: "matches",
      title: "Document processed",
      body: `${file.name} ready for matching.`,
      is_read: false,
      created_at: now(),
    });
  });
  return json(document);
}

async function handleVacancies(segments: string[], request: NextRequest) {
  const vacancyId = segments[1];
  if (!vacancyId) {
    if (request.method === "GET") {
      const store = await getStore();
      const url = new URL(request.url);
      const query = normalizeQuery(url.searchParams.get("q"));
      const location = normalizeQuery(url.searchParams.get("location"));
      const remoteFilter = url.searchParams.get("remote");
      const salaryMin = Number(url.searchParams.get("salary_min") ?? "");
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("page_size") ?? "10");
      const remoteValue =
        remoteFilter === null ? null : remoteFilter === "true" ? true : remoteFilter === "false" ? false : null;

      const filtered = store.vacancies.filter((vacancy) => {
        if (query) {
          const matches =
            matchQuery(vacancy.title, query) ||
            matchQuery(vacancy.company, query) ||
            matchQuery(vacancy.description, query);
          if (!matches) return false;
        }
        if (location && !matchQuery(vacancy.location, location)) return false;
        if (remoteValue !== null && vacancy.remote !== remoteValue) return false;
        if (!Number.isNaN(salaryMin) && salaryMin > 0) {
          const max = vacancy.salary_max ?? vacancy.salary_min ?? 0;
          if (max < salaryMin) return false;
        }
        return true;
      });

      return json(paginate(filtered, page, pageSize));
    }
    if (request.method === "POST") {
      const payload = (await request.json().catch(() => ({}))) as Partial<Vacancy>;
      if (!payload.title) {
        return error("Title is required", 400);
      }
      const vacancy: Vacancy = {
        id: createId(),
        title: payload.title,
        company: payload.company ?? null,
        location: payload.location ?? null,
        remote: Boolean(payload.remote),
        salary_min: payload.salary_min ?? null,
        salary_max: payload.salary_max ?? null,
        currency: payload.currency ?? "USD",
        description: payload.description ?? null,
        source: "manual",
        url: payload.url ?? null,
        source_id: null,
        external_id: null,
      };
      await updateStore((store) => {
        store.vacancies.unshift(vacancy);
      });
      return json(vacancy, 201);
    }
    return error("Method not allowed", 405);
  }

  if (vacancyId === "import" && segments[2] === "csv") {
    if (request.method !== "POST") {
      return error("Method not allowed", 405);
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return error("Missing file", 400);
    }
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      return error("CSV missing data", 400);
    }
    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    const items: Vacancy[] = [];
    for (const row of rows.slice(1)) {
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        record[key] = row[index] ?? "";
      });
      const vacancy: Vacancy = {
        id: createId(),
        title: record.title || "Untitled role",
        company: record.company || null,
        location: record.location || null,
        remote: ["true", "yes", "1"].includes(record.remote?.toLowerCase() ?? ""),
        salary_min: record.salary_min ? Number(record.salary_min) : null,
        salary_max: record.salary_max ? Number(record.salary_max) : null,
        currency: record.currency || "USD",
        description: record.description || null,
        source: "csv",
        url: record.url || null,
        source_id: null,
        external_id: record.external_id || null,
      };
      items.push(vacancy);
    }
    await updateStore((store) => {
      store.vacancies.unshift(...items);
      store.importRuns.unshift({
        id: createId(),
        source_id: "csv",
        started_at: now(),
        finished_at: now(),
        inserted_count: items.length,
        updated_count: 0,
        status: "completed",
        error: null,
      });
    });
    return json(items);
  }

  if (request.method === "GET") {
    const store = await getStore();
    const vacancy = store.vacancies.find((item) => item.id === vacancyId);
    if (!vacancy) return error("Vacancy not found", 404);
    return json(vacancy);
  }
  if (request.method === "PUT") {
    const payload = (await request.json().catch(() => ({}))) as Partial<Vacancy>;
    const updated = await updateStore((store) => {
      const vacancy = store.vacancies.find((item) => item.id === vacancyId);
      if (!vacancy) return null;
      Object.assign(vacancy, payload);
      return vacancy;
    });
    if (!updated) return error("Vacancy not found", 404);
    return json(updated);
  }
  if (request.method === "DELETE") {
    await updateStore((store) => {
      store.vacancies = store.vacancies.filter((item) => item.id !== vacancyId);
      store.matches = store.matches.filter((match) => match.vacancy_id !== vacancyId);
      store.generated = store.generated.filter((pkg) => pkg.vacancy_id !== vacancyId);
      store.applications = store.applications.filter((app) => app.vacancy_id !== vacancyId);
    });
    return json({ status: "ok" });
  }
  return error("Method not allowed", 405);
}

async function handleMatching(request: NextRequest) {
  if (request.method !== "POST") {
    return error("Method not allowed", 405);
  }
  const result = await updateStore((store) => {
    const matches = buildMatches(store);
    store.matches = matches;
    store.lastMatchingRunAt = now();
    recordActivity(store, { date: toIsoDate(), matches_created: matches.length });
    if (matches.length) {
      store.notifications.unshift({
        id: createId(),
        type: "matches",
        title: "New matches generated",
        body: `${matches.length} matches are ready to review.`,
        is_read: false,
        created_at: now(),
      });
    }
    return { matches_created: matches.length };
  });
  return json(result);
}

function buildPackage(profile: Profile, vacancy: Vacancy, match?: Match | MatchDetail | null): GeneratedPackage {
  const name = profile.full_name ?? "Candidate";
  const company = vacancy.company ?? "the company";
  const skills = match?.matched_skills?.length ? match.matched_skills.join(", ") : "your core skills";
  const cvText = `Candidate: ${name}\nRole: ${vacancy.title}\nLocation: ${profile.location ?? "Remote"}\nKey skills: ${skills}`;
  const coverLetter = `Hi ${company} team,\n\nI'm excited about the ${vacancy.title} role. My background in ${skills} aligns with the role requirements and I'm eager to contribute.\n\nThank you,\n${name}`;
  const hrMessage = `Hello ${company} recruiting,\n\nI'd love to be considered for the ${vacancy.title} role. Happy to share more details.\n\nBest,\n${name}`;

  return {
    id: createId(),
    vacancy_id: vacancy.id,
    cv_text: cvText,
    cover_letter_text: coverLetter,
    hr_message_text: hrMessage,
    export_pdf_s3_key: null,
  };
}

async function handleGeneration(segments: string[], request: NextRequest) {
  const vacancyId = segments[1];
  if (!vacancyId || request.method !== "POST") {
    return error("Method not allowed", 405);
  }
  const store = await getStore();
  const vacancy = store.vacancies.find((item) => item.id === vacancyId);
  if (!vacancy) return error("Vacancy not found", 404);

  const match = store.matches.find((item) => item.vacancy_id === vacancyId) ?? buildMatch(store, vacancy);
  const pkg = buildPackage(store.profile, vacancy, match);

  await updateStore((nextStore) => {
    nextStore.generated.unshift(pkg);
    recordActivity(nextStore, { date: toIsoDate(), packages_generated: 1 });
  });

  return json({ package_id: pkg.id });
}

async function handleMatches(segments: string[], request: NextRequest) {
  const matchId = segments[2];
  if (request.method !== "GET") {
    return error("Method not allowed", 405);
  }
  const store = await getStore();
  if (matchId) {
    const match = store.matches.find((item) => item.id === matchId) as MatchDetail | undefined;
    if (!match) return error("Match not found", 404);
    return json(match);
  }
  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams.get("q"));
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("page_size") ?? "10");
  const filtered = store.matches.filter((match) => {
    if (!query) return true;
    return (
      matchQuery(match.vacancy_title, query) ||
      matchQuery(match.vacancy_company, query) ||
      matchQuery(match.vacancy_description, query)
    );
  });
  return json(paginate(filtered, page, pageSize));
}

async function handleApplications(segments: string[], request: NextRequest) {
  const vacancyId = segments[2];
  const subAction = segments[3];
  if (!vacancyId) {
    if (request.method === "GET") {
      const store = await getStore();
      return json(store.applications);
    }
    return error("Not found", 404);
  }

  if (subAction === "reminders" && request.method === "POST") {
    const payload = (await request.json().catch(() => ({}))) as { title?: string; follow_up_days?: number };
    const reminder: Reminder = {
      id: createId(),
      application_id: vacancyId,
      title: payload.title ?? "Follow up",
      note: null,
      due_at: new Date(Date.now() + (payload.follow_up_days ?? 7) * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      created_at: now(),
      updated_at: now(),
    };
    await updateStore((store) => {
      store.reminders.unshift(reminder);
    });
    return json(reminder, 201);
  }

  if (request.method === "PUT") {
    const payload = (await request.json().catch(() => ({}))) as Partial<Application>;
    const updated = await updateStore((store) => {
      let app = store.applications.find((item) => item.vacancy_id === vacancyId);
      if (!app) {
        app = {
          id: createId(),
          vacancy_id: vacancyId,
          status: payload.status ?? "saved",
          notes: payload.notes ?? null,
          interview_notes: payload.interview_notes ?? null,
          updated_at: now(),
        };
        store.applications.unshift(app);
        return app;
      }
      app.status = payload.status ?? app.status;
      app.notes = payload.notes ?? app.notes;
      app.interview_notes = payload.interview_notes ?? app.interview_notes;
      app.updated_at = now();
      return app;
    });
    return json(updated);
  }
  return error("Method not allowed", 405);
}

async function handleReminders(segments: string[], request: NextRequest) {
  const reminderId = segments[2];
  if (!reminderId) {
    if (request.method === "GET") {
      const store = await getStore();
      return json(store.reminders);
    }
    return error("Not found", 404);
  }
  if (request.method === "PUT") {
    const payload = (await request.json().catch(() => ({}))) as Partial<Reminder>;
    const updated = await updateStore((store) => {
      const reminder = store.reminders.find((item) => item.id === reminderId);
      if (!reminder) return null;
      reminder.status = payload.status ?? reminder.status;
      reminder.note = payload.note ?? reminder.note;
      reminder.updated_at = now();
      return reminder;
    });
    if (!updated) return error("Reminder not found", 404);
    return json(updated);
  }
  return error("Method not allowed", 405);
}

async function handleFilters(request: NextRequest) {
  if (request.method === "GET") {
    const store = await getStore();
    return json(store.filters);
  }
  if (request.method === "POST") {
    const payload = (await request.json().catch(() => ({}))) as Partial<SavedFilter>;
    if (!payload.name) return error("Name is required", 400);
    const filter: SavedFilter = {
      id: createId(),
      name: payload.name,
      location: payload.location ?? null,
      remote: payload.remote ?? null,
      salary_min: payload.salary_min ?? null,
      role_keywords: payload.role_keywords ?? null,
      created_at: now(),
    };
    await updateStore((store) => {
      store.filters.unshift(filter);
    });
    return json(filter, 201);
  }
  return error("Method not allowed", 405);
}

async function handleNotifications(segments: string[], request: NextRequest) {
  const notificationId = segments[2];
  if (!notificationId) {
    if (request.method === "GET") {
      const store = await getStore();
      return json(store.notifications);
    }
    return error("Not found", 404);
  }
  if (notificationId === "mark-all-read" && request.method === "PUT") {
    await updateStore((store) => {
      store.notifications.forEach((item) => {
        item.is_read = true;
      });
    });
    return json({ status: "ok" });
  }
  if (request.method === "PUT") {
    const updated = await updateStore((store) => {
      const notification = store.notifications.find((item) => item.id === notificationId);
      if (!notification) return null;
      notification.is_read = true;
      return notification;
    });
    if (!updated) return error("Notification not found", 404);
    return json(updated);
  }
  return error("Method not allowed", 405);
}

function computeStats(store: Awaited<ReturnType<typeof getStore>>) {
  const applicationsByStatus = {
    saved: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  store.applications.forEach((app) => {
    applicationsByStatus[app.status] += 1;
  });

  const buckets = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "20-40", min: 20, max: 40, count: 0 },
    { range: "40-60", min: 40, max: 60, count: 0 },
    { range: "60-80", min: 60, max: 80, count: 0 },
    { range: "80-100", min: 80, max: 100, count: 0 },
  ];
  store.matches.forEach((match) => {
    const bucket = buckets.find((item) => match.score >= item.min && match.score < item.max);
    if (bucket) bucket.count += 1;
  });

  const salaryBuckets = [
    { title: "Entry", min: 0, max: 60000 },
    { title: "Mid", min: 60000, max: 120000 },
    { title: "Senior", min: 120000, max: 200000 },
  ];
  store.vacancies.forEach((vacancy) => {
    const min = vacancy.salary_min ?? 0;
    const max = vacancy.salary_max ?? min;
    salaryBuckets.forEach((bucket) => {
      if (max >= bucket.min && min <= bucket.max) {
        bucket.min = Math.min(bucket.min, min);
        bucket.max = Math.max(bucket.max, max);
      }
    });
  });

  const today = new Date();
  const activityLast14Days = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - index));
    const dateKey = date.toISOString().slice(0, 10);
    const found = store.activity.find((item) => item.date === dateKey);
    return (
      found ?? {
        date: dateKey,
        matches_created: 0,
        packages_generated: 0,
      }
    );
  });

  return {
    vacancies_count: store.vacancies.length,
    matches_count: store.matches.length,
    documents_count: store.documents.length,
    documents_parsed_count: store.documents.filter((doc) => doc.status === "processed").length,
    applications_by_status: applicationsByStatus,
    score_histogram_data: store.matches.length ? buckets.map(({ range, count }) => ({ range, count })) : [],
    salary_buckets_data: store.vacancies.length ? salaryBuckets : [],
    activity_last_14_days: activityLast14Days,
    last_matching_run_at: store.lastMatchingRunAt ?? null,
    upcoming_reminders: store.reminders.filter((reminder) => reminder.status === "pending").length,
  };
}

async function handleStats(request: NextRequest) {
  if (request.method !== "GET") {
    return error("Method not allowed", 405);
  }
  const store = await getStore();
  return json(computeStats(store));
}

async function handleGenerated(segments: string[], request: NextRequest) {
  const packageId = segments[2];
  const subAction = segments[3];
  if (!packageId) return error("Not found", 404);

  if (subAction === "download" && request.method === "GET") {
    const store = await getStore();
    const pkg = store.generated.find((item) => item.id === packageId);
    if (!pkg) return error("Package not found", 404);
    const url = new URL(request.url);
    const section = url.searchParams.get("section");
    let content = pkg.cover_letter_text;
    if (section === "cv") content = pkg.cv_text;
    if (section === "hr") content = pkg.hr_message_text;
    return new Response(content, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  if (subAction === "export" && segments[4] === "pdf" && request.method === "POST") {
    const url = new URL(request.url);
    const downloadUrl = `${url.origin}/api/me/generated/${packageId}/download?format=txt&section=cover`;
    return json({ download_url: downloadUrl });
  }

  if (subAction === "share" && request.method === "POST") {
    const url = new URL(request.url);
    const token = createId();
    await updateStore((store) => {
      store.shareLinks.unshift({ token, package_id: packageId, created_at: now() });
    });
    return json({ url: `${url.origin}/public/generated/${token}`, token, expires_at: null });
  }

  if (subAction === "share" && request.method === "DELETE") {
    await updateStore((store) => {
      store.shareLinks = store.shareLinks.filter((link) => link.package_id !== packageId);
    });
    return json({ status: "ok" });
  }

  if (subAction === "bundle.zip" && request.method === "GET") {
    const content = `Package bundle for ${packageId}`;
    return new Response(content, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=package-${packageId}.zip`,
      },
    });
  }

  if (request.method === "GET") {
    const store = await getStore();
    const pkg = store.generated.find((item) => item.id === packageId);
    if (!pkg) return error("Package not found", 404);
    return json(pkg);
  }
  return error("Method not allowed", 405);
}

async function handleAdmin(segments: string[], request: NextRequest) {
  const action = segments[1];
  if (action === "health" && request.method === "GET") {
    return json({
      queue_size: 0,
      workers: 1,
      last_worker_heartbeat: now(),
      parsing_status_counts: { processed: 0, pending: 0, failed: 0 },
      db: "in-memory",
      redis: "in-memory",
      minio: "in-memory",
    });
  }
  if (action === "jobs" && segments[2] === "queue" && request.method === "GET") {
    return json({ count: 0, job_ids: [] });
  }
  if (action === "metrics" && request.method === "GET") {
    return json({ queue_size: 0, last_scheduler_run_at: null });
  }
  if (action === "users" && request.method === "GET") {
    const store = await getStore();
    return json({ items: store.users.map((user) => ({ ...user, documents_count: store.documents.length })), total: store.users.length, page: 1, page_size: store.users.length });
  }
  if (action === "vacancy-sources") {
    if (segments.length === 2) {
      if (request.method === "GET") {
        const store = await getStore();
        return json(store.vacancySources);
      }
      if (request.method === "POST") {
        const payload = (await request.json().catch(() => ({}))) as Partial<VacancySource>;
        if (!payload.name || !payload.type) return error("Name and type required", 400);
        const source: VacancySource = {
          id: createId(),
          name: payload.name,
          type: payload.type,
          url: payload.url ?? null,
          config: payload.config ?? null,
          is_enabled: payload.is_enabled ?? true,
          created_at: now(),
        };
        await updateStore((store) => {
          store.vacancySources.unshift(source);
        });
        return json(source, 201);
      }
    }
    if (segments.length >= 3) {
      const sourceId = segments[2];
      if (segments[3] === "run-now" && request.method === "POST") {
        const run: VacancyImportRun = {
          id: createId(),
          source_id: sourceId,
          started_at: now(),
          finished_at: now(),
          inserted_count: 0,
          updated_count: 0,
          status: "completed",
          error: null,
        };
        await updateStore((store) => {
          store.importRuns.unshift(run);
        });
        return json(run, 201);
      }
      if (request.method === "PUT") {
        const payload = (await request.json().catch(() => ({}))) as Partial<VacancySource>;
        const updated = await updateStore((store) => {
          const source = store.vacancySources.find((item) => item.id === sourceId);
          if (!source) return null;
          Object.assign(source, payload);
          return source;
        });
        if (!updated) return error("Source not found", 404);
        return json(updated);
      }
    }
  }
  if (action === "import-runs" && request.method === "GET") {
    const store = await getStore();
    return json(store.importRuns);
  }
  return error("Not found", 404);
}

async function handlePublic(segments: string[], request: NextRequest) {
  if (segments[1] === "generated" && request.method === "GET") {
    const token = segments[2];
    const store = await getStore();
    const link = store.shareLinks.find((item) => item.token === token);
    if (!link) return error("Share link not found", 404);
    const pkg = store.generated.find((item) => item.id === link.package_id);
    if (!pkg) return error("Package not found", 404);
    return json(pkg);
  }
  return error("Not found", 404);
}

export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const segments = params.path ?? [];
  const root = segments[0];
  if (!root) return error("Not found", 404);
  if (root === "auth") return handleAuth(segments, request);
  if (root === "me") {
    if (segments[1] === "profile") return handleProfile(request);
    if (segments[1] === "documents") return handleDocuments(segments, request);
    if (segments[1] === "matches") return handleMatches(segments, request);
    if (segments[1] === "applications") return handleApplications(segments, request);
    if (segments[1] === "reminders") return handleReminders(segments, request);
    if (segments[1] === "filters") return handleFilters(request);
    if (segments[1] === "notifications") return handleNotifications(segments, request);
    if (segments[1] === "stats") return handleStats(request);
    if (segments[1] === "generated") return handleGenerated(segments, request);
  }
  if (root === "vacancies") return handleVacancies(segments, request);
  if (root === "admin") return handleAdmin(segments, request);
  if (root === "public") return handlePublic(segments, request);
  return error("Not found", 404);
}

export async function POST(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const segments = params.path ?? [];
  const root = segments[0];
  if (!root) return error("Not found", 404);
  if (root === "auth") return handleAuth(segments, request);
  if (root === "me") {
    if (segments[1] === "profile") return handleProfile(request);
    if (segments[1] === "documents" && segments[2] === "upload") return handleDocumentUpload(request);
    if (segments[1] === "documents") return handleDocuments(segments, request);
    if (segments[1] === "applications") return handleApplications(segments, request);
    if (segments[1] === "reminders") return handleReminders(segments, request);
    if (segments[1] === "filters") return handleFilters(request);
    if (segments[1] === "notifications") return handleNotifications(segments, request);
    if (segments[1] === "generated") return handleGenerated(segments, request);
  }
  if (root === "vacancies") return handleVacancies(segments, request);
  if (root === "matching") return handleMatching(request);
  if (root === "generation") return handleGeneration(segments, request);
  if (root === "admin") return handleAdmin(segments, request);
  return error("Not found", 404);
}

export async function PUT(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const segments = params.path ?? [];
  const root = segments[0];
  if (!root) return error("Not found", 404);
  if (root === "me") {
    if (segments[1] === "profile") return handleProfile(request);
    if (segments[1] === "applications") return handleApplications(segments, request);
    if (segments[1] === "reminders") return handleReminders(segments, request);
    if (segments[1] === "notifications") return handleNotifications(segments, request);
  }
  if (root === "vacancies") return handleVacancies(segments, request);
  if (root === "admin") return handleAdmin(segments, request);
  return error("Not found", 404);
}

export async function DELETE(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const segments = params.path ?? [];
  const root = segments[0];
  if (!root) return error("Not found", 404);
  if (root === "me" && segments[1] === "generated") {
    return handleGenerated(segments, request);
  }
  if (root === "vacancies") return handleVacancies(segments, request);
  if (root === "admin") return handleAdmin(segments, request);
  return error("Not found", 404);
}
