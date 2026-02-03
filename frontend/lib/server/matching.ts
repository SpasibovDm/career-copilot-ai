import type { Match, MatchDetail, Vacancy } from "@/types/api";
import type { Store } from "@/lib/server/store";
import { createId } from "@/lib/server/store";

const SKILL_LEXICON = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "node.js",
  "python",
  "fastapi",
  "sql",
  "postgres",
  "redis",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "graphql",
  "rest",
  "tailwind",
  "figma",
  "java",
  "go",
  "rust",
  "c++",
  "c#",
  "kotlin",
  "swift",
  "product",
  "design",
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSkills(skills: string[]) {
  return skills.map((skill) => normalize(skill)).filter(Boolean);
}

function extractSkills(text?: string | null) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SKILL_LEXICON.filter((skill) => lower.includes(skill));
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function intersect(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

export function buildMatch(store: Store, vacancy: Vacancy): MatchDetail {
  const profileSkills = normalizeSkills(store.profile.skills ?? []);
  const requiredSkills = unique(
    extractSkills(vacancy.title)
      .concat(extractSkills(vacancy.company))
      .concat(extractSkills(vacancy.description))
  );

  const normalizedRequired = normalizeSkills(requiredSkills);
  const matchedSkills = intersect(normalizedRequired, profileSkills);
  const missingSkills = normalizedRequired.filter((skill) => !matchedSkills.includes(skill));

  let scoreBase = normalizedRequired.length;
  let matchedCount = matchedSkills.length;
  if (!scoreBase) {
    const description = vacancy.description ?? "";
    const matchedByProfile = profileSkills.filter((skill) => description.toLowerCase().includes(skill));
    matchedCount = matchedByProfile.length;
    scoreBase = Math.max(profileSkills.length, 1);
  }

  const rawScore = Math.round((matchedCount / Math.max(scoreBase, 1)) * 100);
  const score = Math.max(20, Math.min(rawScore, 98));
  const reasons: string[] = [];
  if (matchedSkills.length) {
    reasons.push(`Skills overlap: ${matchedSkills.join(", ")}`);
  }
  if (vacancy.remote) {
    reasons.push("Role allows remote work.");
  }
  if (store.profile.location && vacancy.location) {
    reasons.push(`Location fit for ${store.profile.location}.`);
  }

  return {
    id: createId(),
    vacancy_id: vacancy.id,
    score,
    explanation: `Matched ${matchedCount} of ${Math.max(scoreBase, 1)} skill signals.`,
    missing_skills: missingSkills.slice(0, 6),
    matched_skills: matchedSkills.slice(0, 6),
    reasons,
    vacancy_title: vacancy.title,
    vacancy_company: vacancy.company ?? null,
    vacancy_description: vacancy.description ?? null,
    tokens: normalizedRequired,
    skill_gap_plan: missingSkills.slice(0, 4).map((skill) => ({
      skill,
      link: `https://example.com/learn/${encodeURIComponent(skill.replace(/\s+/g, "-"))}`,
    })),
  };
}

export function buildMatches(store: Store): Match[] {
  return store.vacancies.map((vacancy) => buildMatch(store, vacancy));
}
