import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const pipelineSteps = [
  {
    step: '01',
    title: 'Connect your endpoint',
    text: 'Paste your ComfyUI tunnel URL and instantly validate connectivity before you spend credits or time.',
    tag: 'Setup',
  },
  {
    step: '02',
    title: 'Upload a reference frame',
    text: 'Bring in the key image that anchors identity, framing, and visual consistency for the generated shots.',
    tag: 'Input',
  },
  {
    step: '03',
    title: 'Direct the motion',
    text: 'Describe pacing, camera movement, and mood so each segment follows the same creative intent.',
    tag: 'Prompt',
  },
  {
    step: '04',
    title: 'Review live segments',
    text: 'Track generation progress, inspect segment outputs in real time, and iterate only where needed.',
    tag: 'Preview',
  },
  {
    step: '05',
    title: 'Render the final cut',
    text: 'Merge approved segments into one polished MP4 ready for social, product demos, or internal review.',
    tag: 'Export',
  },
];

const statCards = [
  { label: 'Average setup', value: '< 2 min' },
  { label: 'Pipeline visibility', value: 'Live logs' },
  { label: 'Final output', value: 'MP4' },
];

const Landing = () => {
  // Demo State
  const [demoStep, setDemoStep] = useState(0);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleUpload = () => {
    setImageUploaded(true);
    setImageLoaded(false);
  };

  const handleGenerate = () => {
    setDemoStep(1);
    setTimeout(() => setDemoStep(2), 500); 
  };

  const handleStitch = () => {
    setDemoStep(3);
    setTimeout(() => setDemoStep(4), 500); 
  };

  const handleReset = () => {
    setDemoStep(0);
    setImageUploaded(false);
    setImageLoaded(false);
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (prefersReducedMotion) {
      revealElements.forEach((element) => element.classList.add('reveal-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          const delay = Number(element.dataset.delay ?? 0);
          element.style.transitionDelay = `${delay}ms`;

          requestAnimationFrame(() => {
            element.classList.add('reveal-in');
          });

          observer.unobserve(element);
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -2% 0px',
      },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4efe7] text-slate-950 pb-20">
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

      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(125,83,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_30%)]" />
      
      {/* Parallax Blobs */}
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        
        {/* Header (Fades in on load) */}
        <header
          data-reveal
          data-delay="0"
          className="reveal flex items-center justify-between rounded-4xl border border-white/70 bg-white/75 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 z-10"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-900">Frameflow</p>
            <p className="mt-1 text-sm text-slate-600">Minimal end-to-end video generation workspace</p>
          </div>
          <Link
            to="/generator"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
          >
            Open workspace
          </Link>
        </header>

        {/* Hero Section */}
        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_1.2fr] lg:py-16">
          
          {/* Left: Copy & CTA */}
          <section data-reveal data-delay="80" className="reveal space-y-7 z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 backdrop-blur-xl shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
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
                to="/generator"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:scale-105"
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
          </section>

          {/* Right: Interactive Demo */}
          <section data-reveal data-delay="140" id="demo" className="reveal relative z-10">
            <div className="rounded-4xl border border-[#333333]/80 bg-[#161616]/92 p-2 shadow-[0_30px_100px_rgba(12,12,12,0.26)] backdrop-blur-2xl">
              <div className="rounded-3xl border border-[#2f2f2f]/80 bg-[#1d1d1d]/88 p-5 shadow-inner sm:p-6">
                
                {/* Mock Browser/App Header */}
                <div className="mb-6 flex items-center gap-2 border-b border-[#303030] pb-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-400/80"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-400/80"></div>
                    <div className="h-3 w-3 rounded-full bg-emerald-400/80"></div>
                  </div>
                  <span className="ml-3 text-xs font-semibold tracking-wider uppercase text-[#a8a8a8]">Frameflow Demo</span>
                </div>

                {/* Prompt Input */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      readOnly 
                      value="A well-lit professional man stands..." 
                      className="w-full rounded-xl border border-[#343434] bg-[#121212] px-4 py-3.5 text-sm text-[#efefef] outline-none ring-1 ring-[#343434]/60 shadow-sm placeholder:text-[#9b9b9b]"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
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

                {/* Interactive State Area */}
                <div className="relative flex min-h-55 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#2f2f2f]/80 bg-[#111111] p-4">
                  
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
                            src="/demo-upload-image.jpg"
                            alt="Uploaded source preview"
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageLoaded(true)}
                            className={`aspect-video w-full object-cover ${!imageLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-full border border-[#2f2f2f]/80 bg-[#181818] px-4 py-2 text-xs font-medium text-[#ebebeb]">
                        <span>Source image uploaded</span>
                        <span className="text-[#a8a8a8]">Ready to generate</span>
                      </div>
                    </div>
                  )}

                  {(demoStep === 1 || demoStep === 3) && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#363636] border-t-[#f1efe9]"></div>
                      <p className="animate-pulse text-sm font-medium text-[#ececec]">
                        {demoStep === 1 ? 'Generating video segments...' : 'Stitching final MP4...'}
                      </p>
                    </div>
                  )}

                  {demoStep === 2 && (
                    <div className="w-full space-y-4 animate-in fade-in zoom-in duration-500">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative aspect-video overflow-hidden rounded-lg bg-[#1c1c1c] shadow-md ring-1 ring-white/10">
                          <video src="/demo-segment-1.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">Segment 1</div>
                        </div>
                        <div className="relative aspect-video overflow-hidden rounded-lg bg-[#1c1c1c] shadow-md ring-1 ring-white/10">
                          <video src="/demo-segment-2.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">Segment 2</div>
                        </div>
                      </div>
                      <div className="flex justify-center pt-2">
                        <button 
                          onClick={handleStitch}
                          className="flex items-center gap-2 rounded-full bg-[#f1efe9] px-6 py-2.5 text-sm font-semibold text-[#161616] shadow-md transition-all hover:bg-white active:scale-95"
                        >
                          Merge to Final MP4
                        </button>
                      </div>
                    </div>
                  )}

                  {demoStep === 4 && (
                    <div className="w-full flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl bg-[#1c1c1c] shadow-xl ring-4 ring-white/10">
                        <video src="/demo-final.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover" />
                        <div className="absolute top-3 right-3 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md shadow-sm">
                          FINAL RENDER
                        </div>
                      </div>
                      <button 
                        onClick={handleReset}
                        className="text-xs font-semibold text-[#a8a8a8] underline underline-offset-4 transition-colors hover:text-[#f1efe9]"
                      >
                        Reset Demo
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Workflow Story Section */}
        <section
          data-reveal
          data-delay="120"
          className="relative mt-8 overflow-hidden rounded-4xl border border-white/65 bg-white/55 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-7 lg:p-10"
        >
          <div className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-sky-200/45 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.3fr]">
            <div data-reveal data-delay="180" className="reveal lg:sticky lg:top-10 lg:self-start">
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                Pipeline walkthrough
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                A premium flow from prompt to final render.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
                This section is intentionally vertical: each step lands with breathing room, subtle motion, and clear hierarchy so the journey feels guided instead of crowded.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {statCards.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-col gap-4">
              <div className="pointer-events-none absolute left-5.5 top-4 bottom-4 w-px bg-linear-to-b from-slate-300/80 via-slate-300/50 to-transparent" />

              {pipelineSteps.map((item, index) => (
                <article
                  data-reveal
                  data-delay={220 + index * 110}
                  key={item.step}
                  className="reveal relative ml-0 rounded-2xl border border-white/70 bg-white/85 p-5 pl-14 shadow-[0_10px_32px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)]"
                >
                  <div className="absolute left-4 top-5 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-slate-950 text-[10px] font-bold tracking-wider text-white">
                    {item.step}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{item.title}</h3>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.tag}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Landing;