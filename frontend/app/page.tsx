import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Smart Matching",
    description: "Score every vacancy against your profile and highlight missing skills.",
  },
  {
    title: "Document Intelligence",
    description: "Upload CVs and certifications once, then reuse them everywhere.",
  },
  {
    title: "Automated Outreach",
    description: "Generate tailored CVs, cover letters, and HR messages in minutes.",
  },
];

const stats = [
  { label: "Vacancies tracked", value: "12k+" },
  { label: "Automations run", value: "4.8k" },
  { label: "Career outcomes", value: "93%" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-emerald-300" />
          Career Copilot Portal
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-200 hover:text-white">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Production-ready job search automation
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Launch your job search command center with AI-guided insights.
            </h1>
            <p className="text-lg text-slate-300">
              Career Copilot Portal orchestrates your vacancies, documents, and matching pipelines
              in one modern workspace.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                <Link href="/register">
                  Start onboarding <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white">
                <Link href="/dashboard">View demo dashboard</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 pt-6">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-semibold">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="grid gap-4">
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="text-xs uppercase text-slate-400">Screenshot placeholder</div>
                <div className="mt-4 h-40 rounded-lg bg-gradient-to-r from-emerald-400/30 to-blue-400/30" />
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="text-xs uppercase text-slate-400">Automation preview</div>
                <div className="mt-4 h-24 rounded-lg bg-gradient-to-r from-purple-400/30 to-pink-400/30" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-12 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-white/10 bg-white/5 text-white shadow-lg">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">{feature.description}</CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Ready to accelerate your search?</h2>
              <p className="text-slate-300">Connect your documents, import vacancies, and let AI do the rest.</p>
            </div>
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/onboarding">Launch onboarding</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
