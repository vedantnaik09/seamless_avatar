import { useState } from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  // Demo State: 0=Idle, 1=Generating Segments, 2=Segments Ready, 3=Stitching, 4=Final Ready
  const [demoStep, setDemoStep] = useState(0);

  const handleGenerate = () => {
    setDemoStep(1);
    setTimeout(() => setDemoStep(2), 500); // Mock 2-second generation time
  };

  const handleStitch = () => {
    setDemoStep(3);
    setTimeout(() => setDemoStep(4), 500); // Mock 2-second stitching time
  };

  const handleReset = () => setDemoStep(0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4efe7] text-slate-950 pb-20">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(125,83,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_30%)]" />
      <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="flex items-center justify-between rounded-4xl border border-white/70 bg-white/75 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 z-10">
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
          <section className="space-y-7 z-10">
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
          <section id="demo" className="relative z-10">
            <div className="rounded-4xl border border-[#2f2f2f]/80 bg-[#151515]/92 p-2 shadow-[0_30px_100px_rgba(12,12,12,0.28)] backdrop-blur-2xl">
              <div className="rounded-3xl border border-[#40362d]/80 bg-[#1e1414]/88 p-5 shadow-inner sm:p-6">
                
                {/* Mock Browser/App Header */}
                <div className="mb-6 flex items-center gap-2 border-b border-[#3c332b] pb-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-400/80"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-400/80"></div>
                    <div className="h-3 w-3 rounded-full bg-emerald-400/80"></div>
                  </div>
                  <span className="ml-3 text-xs font-semibold tracking-wider uppercase text-[#b9aa98]">Frameflow Demo</span>
                </div>

                {/* Prompt Input */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      readOnly 
                      value="A well-lit professional man stands..." 
                      className="w-full rounded-xl border border-[#4a3f35] bg-[#12100d] px-4 py-3.5 text-sm text-[#efe7dd] outline-none ring-1 ring-[#4a3f35]/60 shadow-sm placeholder:text-[#9f9181]"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <span className="text-xs font-medium text-[#b8aa9b]">Prompt</span>
                    </div>
                  </div>
                  
                  {demoStep === 0 && (
                    <button 
                      onClick={handleGenerate}
                      className="whitespace-nowrap rounded-xl bg-[#f2eadf] px-6 py-3.5 text-sm font-semibold text-[#17120e] shadow-md transition-all hover:bg-white active:scale-95"
                    >
                      Generate Segments
                    </button>
                  )}
                </div>

                {/* Interactive State Area */}
                <div className="relative flex min-h-55 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#40362d]/80 bg-[#120f0c] p-4">
                  
                  {demoStep === 0 && (
                    <p className="text-sm font-medium text-[#b8aa9b]">Click generate to start the pipeline</p>
                  )}

                  {(demoStep === 1 || demoStep === 3) && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#3f352d] border-t-[#f2eadf]"></div>
                      <p className="animate-pulse text-sm font-medium text-[#eadfce]">
                        {demoStep === 1 ? 'Generating video segments...' : 'Stitching final MP4...'}
                      </p>
                    </div>
                  )}

                  {demoStep === 2 && (
                    <div className="w-full space-y-4 animate-in fade-in zoom-in duration-500">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative aspect-video overflow-hidden rounded-lg bg-[#1c1713] shadow-md ring-1 ring-white/10">
                          <video src="/demo-segment-1.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">Segment 1</div>
                        </div>
                        <div className="relative aspect-video overflow-hidden rounded-lg bg-[#1c1713] shadow-md ring-1 ring-white/10">
                          <video src="/demo-segment-2.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">Segment 2</div>
                        </div>
                      </div>
                      <div className="flex justify-center pt-2">
                        <button 
                          onClick={handleStitch}
                          className="flex items-center gap-2 rounded-full bg-[#f2eadf] px-6 py-2.5 text-sm font-semibold text-[#17120e] shadow-md transition-all hover:bg-white active:scale-95"
                        >
                          Merge to Final MP4
                        </button>
                      </div>
                    </div>
                  )}

                  {demoStep === 4 && (
                    <div className="w-full flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl bg-[#1c1713] shadow-xl ring-4 ring-white/10">
                        <video src="/demo-final.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover" />
                        <div className="absolute top-3 right-3 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md shadow-sm">
                          FINAL RENDER
                        </div>
                      </div>
                      <button 
                        onClick={handleReset}
                        className="text-xs font-semibold text-[#b8aa9b] underline underline-offset-4 transition-colors hover:text-[#f2eadf]"
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

        {/* Feature Steps List */}
        <section className="grid gap-4 mt-8 sm:grid-cols-4 z-10 relative">
          {[
            { step: '01', title: 'Connect', text: 'Link your ComfyUI tunnel URL.' },
            { step: '02', title: 'Input', text: 'Upload reference image & prompt.' },
            { step: '03', title: 'Stream', text: 'Watch segments appear live.' },
            { step: '04', title: 'Export', text: 'Download the stitched MP4.' },
          ].map((item) => (
            <div key={item.step} className="rounded-3xl border border-white/60 bg-white/40 p-5 text-sm shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all hover:bg-white/60">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step {item.step}</p>
              <p className="font-semibold text-slate-950 mb-1">{item.title}</p>
              <p className="text-slate-600 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Landing;