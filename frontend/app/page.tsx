"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const pipelineSteps = [
  {
    step: "01",
    title: "Connect your endpoint",
    text: "Paste your ComfyUI tunnel URL and instantly validate connectivity before you spend credits or time.",
    tag: "Setup",
  },
  {
    step: "02",
    title: "Upload a reference frame",
    text: "Bring in the key image that anchors identity, framing, and visual consistency for the generated shots.",
    tag: "Input",
  },
  {
    step: "03",
    title: "Direct the motion",
    text: "Describe pacing, camera movement, and mood so each segment follows the same creative intent.",
    tag: "Prompt",
  },
  {
    step: "04",
    title: "Review live segments",
    text: "Track generation progress, inspect segment outputs in real time, and iterate only where needed.",
    tag: "Preview",
  },
  {
    step: "05",
    title: "Render the final cut",
    text: "Merge approved segments into one polished MP4 ready for social, product demos, or internal review.",
    tag: "Export",
  },
]

const statCards = [
  { label: "Average setup", value: "< 2 min" },
  { label: "Pipeline visibility", value: "Live logs" },
  { label: "Final output", value: "MP4" },
]

export default function Home() {
  const [demoStep, setDemoStep] = useState(0)
  const [imageUploaded, setImageUploaded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleUpload = () => {
    setImageUploaded(true)
    setImageLoaded(false)
  }

  const handleGenerate = () => {
    setDemoStep(1)
    setTimeout(() => setDemoStep(2), 500)
  }

  const handleStitch = () => {
    setDemoStep(3)
    setTimeout(() => setDemoStep(4), 500)
  }

  const handleReset = () => {
    setDemoStep(0)
    setImageUploaded(false)
    setImageLoaded(false)
  }

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"))

    if (prefersReducedMotion) {
      revealElements.forEach((element) => element.classList.add("reveal-in"))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          const element = entry.target as HTMLElement
          const delay = Number(element.dataset.delay ?? 0)
          element.style.transitionDelay = `${delay}ms`

          requestAnimationFrame(() => {
            element.classList.add("reveal-in")
          })

          observer.unobserve(element)
        })
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -2% 0px",
      },
    )

    revealElements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4efe7] pb-20 text-slate-950">
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(22px) scale(0.992);
          filter: blur(4px);
          transition-property: opacity, transform;
          transition-duration: 900ms;
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .reveal-in {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(125,83,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_30%)]" />

      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header
          data-reveal
          data-delay="0"
          className="reveal z-10 flex items-center justify-between rounded-4xl border border-white/70 bg-white/75 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-900">Frameflow</p>
            <p className="mt-1 text-sm text-slate-600">Minimal end-to-end video generation workspace</p>
          </div>
          <Link
            href="/generator"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
          >
            Open workspace
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_1.2fr] lg:py-16">
          <section data-reveal data-delay="80" className="reveal z-10 space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 backdrop-blur-xl shadow-sm">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
              Live video generation
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl/tight">
                Turn a single image into a polished video.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Connect your ComfyUI tunnel, upload a reference image, and watch Frameflow generate segments, stream logs, and assemble the final MP4 in a calm, minimal interface.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/generator"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-slate-800"
              >
                Start generating
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/60 px-6 py-3.5 text-sm font-medium text-slate-700 transition-all hover:bg-white backdrop-blur-md"
              >
                Try the demo
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {statCards.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section data-reveal data-delay="140" id="demo" className="reveal relative z-10">
            <div className="rounded-4xl border border-[#333333]/80 bg-[#161616]/92 p-2 shadow-[0_30px_100px_rgba(12,12,12,0.26)] backdrop-blur-2xl">
              <div className="rounded-3xl border border-[#2f2f2f]/80 bg-[#1d1d1d]/88 p-5 shadow-inner sm:p-6">
                <div className="mb-6 flex items-center gap-2 border-b border-[#303030] pb-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-400/80"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-400/80"></div>
                    <div className="h-3 w-3 rounded-full bg-emerald-400/80"></div>
                  </div>
                  <span className="ml-3 text-xs font-semibold uppercase tracking-wider text-[#a8a8a8]">Frameflow Demo</span>
                </div>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value="A well-lit professional man stands..."
                      className="w-full rounded-xl border border-[#343434] bg-[#121212] px-4 py-3.5 text-sm text-[#efefef] outline-none ring-1 ring-[#343434]/60 shadow-sm placeholder:text-[#9b9b9b]"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <span className="text-xs font-medium text-[#a8a8a8]">Prompt</span>
                    </div>
                  </div>

                  {demoStep === 0 && imageUploaded && (
                    <button
                      onClick={handleGenerate}
                      className="whitespace-nowrap rounded-xl bg-[#f1efe9] px-6 py-3.5 text-sm font-semibold text-[#161616] shadow-md transition-all hover:bg-white active:scale-95"
                    >
                      Generate Segments
                    </button>
                  )}
                </div>

                <div className="relative flex min-h-[13.75rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#2f2f2f]/80 bg-[#111111] p-4">
                  {demoStep === 0 && !imageUploaded && (
                    <div className="w-full max-w-md space-y-4 text-center">
                      <div className="overflow-hidden rounded-2xl border border-[#2f2f2f]/80 bg-[#1c1c1c] shadow-md ring-1 ring-white/10">
                        <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.14))]">
                          <div className="text-center">
                            <p className="text-sm font-semibold text-[#f0f0f0]">Upload source image</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleUpload}
                        className="upload-glow inline-flex items-center justify-center rounded-full bg-[#f1efe9] px-5 py-2.5 text-sm font-semibold text-[#161616] transition-all hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1efe9]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                      >
                        Upload image
                      </button>
                    </div>
                  )}

                  {demoStep === 0 && imageUploaded && (
                    <div className="w-full max-w-md space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-[#2f2f2f]/80 bg-[#1c1c1c] shadow-md ring-1 ring-white/10">
                        <div className="relative">
                          {!imageLoaded && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#363636] border-t-[#f1efe9]"></div>
                            </div>
                          )}

                          <img
                            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80"
                            alt="Uploaded source"
                            onLoad={() => setImageLoaded(true)}
                            className={`aspect-video w-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between gap-3">
                        <button
                          onClick={handleGenerate}
                          className="rounded-full bg-[#f1efe9] px-5 py-2.5 text-sm font-semibold text-[#161616] transition hover:bg-white active:scale-95"
                        >
                          Generate segments
                        </button>
                        <button
                          onClick={handleReset}
                          className="rounded-full border border-[#3a3a3a] px-5 py-2.5 text-sm font-medium text-[#d7d7d7] transition hover:bg-[#232323]"
                        >
                          Reset demo
                        </button>
                      </div>
                    </div>
                  )}

                  {demoStep === 1 && (
                    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
                      <div className="h-16 w-16 animate-pulse rounded-full border border-[#3a3a3a] bg-[#1f1f1f]" />
                      <p className="text-sm font-medium text-[#f0f0f0]">Generating segments…</p>
                    </div>
                  )}

                  {demoStep === 2 && (
                    <div className="w-full max-w-md space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {pipelineSteps.slice(0, 2).map((step) => (
                          <div key={step.step} className="rounded-2xl border border-[#2f2f2f]/80 bg-[#181818] p-4 text-left">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f8f8f]">{step.tag}</p>
                            <p className="mt-2 text-sm font-semibold text-[#f4f4f4]">{step.title}</p>
                            <p className="mt-2 text-xs leading-5 text-[#b6b6b6]">{step.text}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleStitch}
                        className="w-full rounded-full bg-[#f1efe9] px-5 py-2.5 text-sm font-semibold text-[#161616] transition hover:bg-white active:scale-95"
                      >
                        Stitch segments
                      </button>
                    </div>
                  )}

                  {demoStep === 3 && (
                    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
                      <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#5a5a5a] bg-[#1b1b1b]" />
                      <p className="text-sm font-medium text-[#f0f0f0]">Stitching final cut…</p>
                    </div>
                  )}

                  {demoStep === 4 && (
                    <div className="w-full max-w-md space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-[#2f2f2f]/80 bg-[#1c1c1c]">
                        <video
                          controls
                          className="aspect-video w-full bg-black"
                          src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#f0f0f0]">Final MP4 ready</p>
                        <button
                          onClick={handleReset}
                          className="rounded-full border border-[#3a3a3a] px-4 py-2 text-xs font-medium text-[#d7d7d7] transition hover:bg-[#232323]"
                        >
                          Run again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section data-reveal data-delay="220" className="reveal relative z-10 grid gap-4 lg:grid-cols-3">
          {pipelineSteps.map((item) => (
            <article
              key={item.step}
              className="rounded-4xl border border-white/70 bg-white/75 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.tag}</span>
                <span className="text-sm font-semibold text-slate-400">{item.step}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}