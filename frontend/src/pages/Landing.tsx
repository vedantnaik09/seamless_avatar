import { Link } from 'react-router-dom'

const Landing = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4efe7] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(125,83,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_30%)]" />
      <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between rounded-4xl border border-white/70 bg-white/75 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Avatar pipeline</p>
            <p className="mt-1 text-sm text-slate-600">Minimal video generation workspace</p>
          </div>
          <Link
            to="/generator"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open generator
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
          <section className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 backdrop-blur-xl">
              Live avatar generation
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                Turn a single image into a clean talking video.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Connect your ComfyUI tunnel, upload a portrait, and watch the pipeline generate segments, stream logs, and assemble the final MP4 in a calm, minimal interface.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/generator"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start generating
              </Link>
              <a
                href="#steps"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                See the flow
              </a>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[
              {
                title: 'One image in',
                text: 'Upload a JPEG, PNG, or WebP and keep the setup focused on a single face-forward shot.',
              },
              {
                title: 'Live progress out',
                text: 'Poll the backend as each segment is generated and keep logs visible while it runs.',
              },
              {
                title: 'Final video ready',
                text: 'Review the stitched MP4 and any intermediate segment previews as soon as they appear.',
              },
              {
                title: 'ComfyUI url included',
                text: 'Set the tunnel URL directly in the generator and let the app save it before submission.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </section>
        </div>

        <section id="steps" className="grid gap-4 pb-2 sm:grid-cols-3">
          {[
            'Connect your ComfyUI URL.',
            'Upload the portrait and enter the prompt.',
            'Watch logs, previews, and the final MP4 appear live.',
          ].map((step, index) => (
            <div key={step} className="rounded-3xl border border-slate-200/70 bg-white/70 px-5 py-4 text-sm text-slate-600 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step {index + 1}</p>
              {step}
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}

export default Landing