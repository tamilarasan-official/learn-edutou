import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm";
import { getLearnPage } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getLearnPage();
  return { title: seo.title, description: seo.description, openGraph: { title: seo.title, description: seo.description } };
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <LandingPage />
    </Suspense>
  );
}

async function LandingPage() {
  const c = await getLearnPage();
  const { hero, webinar } = c;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* ---------- Top band: headline + form ---------- */}
      <div className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-[-10%] hidden h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#ff3b30]/15 to-[#ff7a1a]/10 blur-3xl lg:block"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
          <header className="flex items-center justify-center gap-3 py-6 lg:justify-start lg:py-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.brand.logoUrl} alt={c.brand.name} width={52} height={52} className="h-12 w-12 rounded-xl object-cover lg:h-14 lg:w-14" />
            <div className="leading-tight">
              <p className="text-2xl font-extrabold tracking-tight lg:text-3xl">{c.brand.name}</p>
              <p className="text-sm font-semibold text-orange-600">{c.brand.tagline}</p>
            </div>
          </header>

          <div className="grid gap-4 pb-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:gap-x-14 lg:gap-y-8 lg:pb-16">
            {/* Headline */}
            <section className="rounded-3xl bg-white px-5 py-7 text-center shadow-sm ring-1 ring-black/5 lg:col-start-1 lg:px-0 lg:py-4 lg:text-left lg:shadow-none lg:ring-0">
              <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">
                {hero.eyebrow}
              </span>
              <h1 className="mt-4 text-[28px] font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                {hero.headlineBefore && `${hero.headlineBefore} `}
                <span className="bg-gradient-to-r from-[#ff3b30] to-[#ff7a1a] bg-clip-text text-transparent">{hero.headlineHighlight}</span>
                {hero.headlineAfter && `${/^[,.!?:;]/.test(hero.headlineAfter) ? "" : " "}${hero.headlineAfter}`}
              </h1>
              {hero.subhead && <p className="mt-3 text-[17px] text-neutral-600 lg:mt-5 lg:max-w-xl lg:text-xl">({hero.subhead})</p>}

              <div className="mt-5 grid grid-cols-3 gap-2 text-left text-xs lg:mt-8 lg:max-w-xl lg:gap-3 lg:text-sm">
                <Info label="When" value={webinar.when} />
                <Info label="Duration" value={webinar.duration} />
                <Info label="Language" value={webinar.language} />
              </div>
            </section>

            {/* Form: right column on desktop (sticky), straight after the headline on mobile */}
            <section
              id="register"
              className="scroll-mt-4 rounded-3xl bg-gradient-to-br from-[#ff3b30] to-[#ff7a1a] p-4 shadow-xl shadow-orange-500/25 sm:p-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start lg:p-7"
            >
              <h2 className="mb-1 text-center text-lg font-bold text-white lg:text-2xl">{c.form.title}</h2>
              <p className="mb-4 text-center text-sm text-white/85">{webinar.title} · {webinar.when}</p>
              <RegisterForm form={c.form} />
            </section>

            {/* What you'll learn */}
            {c.learn.points.length > 0 && (
              <section className="rounded-3xl bg-white px-5 py-6 shadow-sm ring-1 ring-black/5 lg:col-start-1 lg:bg-neutral-50 lg:px-8 lg:py-8">
                <h2 className="text-xl font-bold lg:text-2xl">{c.learn.title}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-6 lg:gap-4">
                  {c.learn.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">✓</span>
                      <span className="text-neutral-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Hero photo: desktop only, fills the left column under the content */}
            {hero.imageUrl && (
              <div className="hidden overflow-hidden rounded-3xl lg:col-start-1 lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero.imageUrl} alt="" className="aspect-[16/8] w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Proof band ---------- */}
      <section className="bg-neutral-950 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
          {c.stats.length > 0 && (
            <div className="mx-auto grid max-w-4xl gap-4 text-center" style={{ gridTemplateColumns: `repeat(${Math.min(c.stats.length, 3)}, minmax(0, 1fr))` }}>
              {c.stats.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold text-orange-400 sm:text-4xl lg:text-5xl">{s.value}</p>
                  <p className="mt-1 text-xs text-white/60 sm:text-sm">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {c.institutions.names.length > 0 && (
            <>
              <p className="mt-10 text-center text-xs uppercase tracking-[0.2em] text-white/45">{c.institutions.title}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 lg:gap-3">
                {c.institutions.names.map((name) => (
                  <span key={name} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold lg:px-6 lg:py-3 lg:text-base">
                    {name}
                  </span>
                ))}
              </div>
            </>
          )}

          {c.gallery.photos.length > 0 && (
            <>
              <h2 className="mt-12 text-center text-2xl font-bold sm:text-3xl lg:mt-16 lg:text-4xl">{c.gallery.title}</h2>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:mt-10 lg:grid-cols-4 lg:gap-4">
                {c.gallery.photos.map((g, i) => (
                  <div key={`${g.url}-${i}`} className="overflow-hidden rounded-xl lg:rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt={g.alt} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-500 hover:scale-105" />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-12 text-center">
            <a
              href="#register"
              className="inline-flex rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#ff7a1a] px-8 py-4 text-lg font-bold text-white shadow-lg"
            >
              {c.form.buttonText}
            </a>
          </div>
        </div>
      </section>

      <footer className={`py-8 text-center text-xs text-neutral-500 ${c.stickyBar.enabled ? "pb-28 lg:pb-8" : ""}`}>
        © 2026 {c.brand.name} {c.brand.tagline} ·{" "}
        <a href="/site.html" className="underline">About {c.brand.name}</a>
      </footer>

      {/* Sticky CTA: phones and tablets only; on desktop the form is always in view */}
      {c.stickyBar.enabled && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">{webinar.title}</p>
              <p className="truncate text-xs text-neutral-500">{webinar.when}</p>
            </div>
            <a href="#register" className="rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#ff7a1a] px-6 py-3 font-bold text-white shadow-md">
              {c.stickyBar.buttonText}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-100 px-2.5 py-2 lg:px-4 lg:py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 lg:text-xs">{label}</p>
      <p className="mt-0.5 font-semibold leading-snug text-neutral-800">{value}</p>
    </div>
  );
}
