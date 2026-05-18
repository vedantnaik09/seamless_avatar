import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type JobStatus = 'queued' | 'running' | 'done' | 'error' | string

type JobLog = {
  ts: string
  level: string
  message: string
}

type JobRecord = {
  job_id: string
  status: JobStatus
  progress: number
  total_segments: number
  segments: string[]
  segment_urls: string[]
  output: string | null
  download_url: string | null
  error: string | null
  logs: JobLog[]
}

type ConnectionState = {
  reachable: boolean
  comfy_url: string
  error?: string
}

type ConfigResponse = {
  comfy_url: string
  connection: ConnectionState
}

type GenerateResponse = {
  job_id: string
  status: string
}

const DEFAULT_NEGATIVE_PROMPT =
  'low quality, worst quality, blurry, out of focus, overexposed, underexposed, low contrast, noisy, distorted face, deformed eyes, bad anatomy, extra fingers, missing fingers, fused fingers, poorly drawn hands, poorly drawn face, duplicate person, multiple people, crowded background, messy background, background movement, subtitles, watermark, text, logo, artifacts, jpeg artifacts, cartoon, painting, anime, unrealistic skin, unnatural lip sync, frozen frame, static pose, weird mouth movement, asymmetrical face, flickering, shaky camera, mutated limbs, extra limbs, bad proportions, tilted face, motion blur, dark lighting, harsh shadows, grainy video, warped body, inconsistent frames, background characters, walking backwards, camera jitter'

const DEFAULT_PROMPT =
  'A well-lit professional man stands centered against a clean modern background, speaking directly to the camera with natural facial expressions and subtle hand gestures. He wears a smart casual shirt and maintains steady eye contact while talking confidently. The background is softly blurred and uncluttered, with bright neutral lighting and minimal distractions. Smooth cinematic camera framing, realistic skin tones, natural lip sync, high detail, clear focus, studio-quality appearance, calm atmosphere.'

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const CLIP_FRAMES = 61
const TRIM_FRAMES = 2
const OUTPUT_FPS = 16
const EFFECTIVE_SEGMENT_SECONDS = (CLIP_FRAMES - TRIM_FRAMES) / OUTPUT_FPS

type NumericFieldValue = string

function joinUrl(baseUrl: string, path?: string | null) {
  if (!path) {
    return ''
  }

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

function formatStatus(status: JobStatus) {
  if (status === 'queued') return 'Queued'
  if (status === 'running') return 'Running'
  if (status === 'done') return 'Complete'
  if (status === 'error') return 'Failed'
  return status
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return value
  }
}

function estimateSegments(durationSeconds: number) {
  return Math.max(1, Math.ceil(durationSeconds / EFFECTIVE_SEGMENT_SECONDS))
}

function parseNumericField(value: NumericFieldValue, fieldName: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`)
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`)
  }

  return parsed
}

async function readResponseError(response: Response) {
  const text = await response.text()
  if (!text) {
    return `${response.status} ${response.statusText}`
  }

  try {
    const parsed = JSON.parse(text) as { detail?: string }
    return parsed.detail || text
  } catch {
    return text
  }
}

const App = () => {
  const apiBase = DEFAULT_API_BASE
  const [comfyUrl, setComfyUrl] = useState('')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE_PROMPT)
  const [durationSeconds, setDurationSeconds] = useState<NumericFieldValue>('10')
  const [width, setWidth] = useState<NumericFieldValue>('640')
  const [height, setHeight] = useState<NumericFieldValue>('480')
  const [cfgScale, setCfgScale] = useState<NumericFieldValue>('5')
  const [steps, setSteps] = useState<NumericFieldValue>('20')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  useEffect(() => {
    let cancelled = false

    const loadConfig = async () => {
      try {
        const response = await fetch(joinUrl(apiBase, '/config'))
        if (!response.ok) {
          throw new Error(await readResponseError(response))
        }

        const data = (await response.json()) as ConfigResponse
        if (cancelled) return

        setComfyUrl(data.comfy_url)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load backend config')
        }
      }
    }

    loadConfig()

    return () => {
      cancelled = true
    }
  }, [apiBase])

  const activeJob = useMemo(() => jobs.find((job) => job.job_id === selectedJobId) || jobs[0] || null, [jobs, selectedJobId])

  useEffect(() => {
    if (!selectedJobId) {
      return
    }

    let cancelled = false
    let timer: number | undefined

    const pollJob = async () => {
      try {
        const response = await fetch(joinUrl(apiBase, `/status/${selectedJobId}`))
        if (!response.ok) {
          throw new Error(await readResponseError(response))
        }

        const data = (await response.json()) as JobRecord
        if (cancelled) return

        setJobs((currentJobs) => [data, ...currentJobs.filter((job) => job.job_id !== data.job_id)])
        setErrorMessage('')

        if (data.status === 'done' || data.status === 'error') {
          setStatusMessage(data.status === 'done' ? 'Video ready for download.' : 'Generation failed.')
          return
        }

        timer = window.setTimeout(pollJob, 2400)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to refresh job status')
          timer = window.setTimeout(pollJob, 3000)
        }
      }
    }

    pollJob()

    return () => {
      cancelled = true
      if (timer) {
        window.clearTimeout(timer)
      }
    }
  }, [apiBase, selectedJobId])

  const submitJob = async () => {
    if (!imageFile) {
      throw new Error('Choose an image first.')
    }

    if (!prompt.trim()) {
      throw new Error('Prompt is required.')
    }

    const parsedDurationSeconds = parseNumericField(durationSeconds, 'Duration')
    const parsedWidth = parseNumericField(width, 'Width')
    const parsedHeight = parseNumericField(height, 'Height')
    const parsedCfgScale = parseNumericField(cfgScale, 'CFG scale')
    const parsedSteps = parseNumericField(steps, 'Steps')

    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('comfy_url', comfyUrl.trim())
    formData.append('prompt', prompt.trim())
    formData.append('negative_prompt', negativePrompt.trim())
    formData.append('duration_seconds', String(parsedDurationSeconds))
    formData.append('width', String(parsedWidth))
    formData.append('height', String(parsedHeight))
    formData.append('cfg_scale', String(parsedCfgScale))
    formData.append('steps', String(parsedSteps))

    const response = await fetch(joinUrl(apiBase, '/generate'), {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(await readResponseError(response))
    }

    const data = (await response.json()) as GenerateResponse
    const optimisticJob: JobRecord = {
      job_id: data.job_id,
      status: data.status,
      progress: 0,
      total_segments: 0,
      segments: [],
      segment_urls: [],
      output: null,
      download_url: null,
      error: null,
      logs: [],
    }

    setJobs((currentJobs) => [optimisticJob, ...currentJobs.filter((job) => job.job_id !== data.job_id)])
    setSelectedJobId(data.job_id)
    setStatusMessage('Job submitted. Polling progress now.')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await submitJob()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit job')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercent = activeJob && activeJob.total_segments > 0 ? Math.min(100, Math.round((activeJob.progress / activeJob.total_segments) * 100)) : 0
  const currentSegment = activeJob ? Math.min(activeJob.progress + (activeJob.status === 'done' ? 0 : 1), Math.max(1, activeJob.total_segments || 1)) : 0
  const estimatedSegments = estimateSegments(Number(durationSeconds) || 1)

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4efe7] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(125,83,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_30%)]" />
      <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/70 bg-white/75 px-5 py-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
              Live video generator
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Create a polished video from one reference image.</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Sync your ComfyUI tunnel, tune the generation parameters, and watch each segment, log line, and final MP4 arrive in real time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              to="/"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back home
            </Link>
            <span className="rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white">API {apiBase.replace(/^https?:\/\//, '')}</span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-4xl border border-white/70 bg-white/75 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Connection</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">ComfyUI tunnel</h2>
                  </div>
                  <p className="text-xs leading-5 text-green-900">
                  Need your own ComfyUI host? Use this Colab setup and get a free link:
                  {' '}
                  <a
                    href="https://colab.research.google.com/drive/1dH04ch7W8A6WMs-FMQeYAPgo3AYxw_it?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-700 underline underline-offset-2 transition hover:text-slate-900"
                  >
                    Open ComfyUI Colab
                  </a>
                </p>
                <input
                  value={comfyUrl}
                  onChange={(event) => setComfyUrl(event.target.value)}
                  placeholder="https://your-pinggy-or-ngrok-url"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                />
                <p className="text-xs leading-5 text-slate-500">
                  The backend receives this URL with each generation request, so you can change tunnels per job.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
                <label className="flex h-full flex-col gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-4 transition hover:border-slate-400 hover:bg-white">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Reference image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                    className="text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                  />
                  {imagePreview ? (
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                      <img src={imagePreview} alt="Selected preview" className="aspect-4/3 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex min-h-36 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white text-sm text-slate-400">
                      Choose a source image to begin.
                    </div>
                  )}
                </label>

                <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Target pacing</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      About {estimatedSegments} segment{estimatedSegments === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Duration</span>
                      <input
                        type="number"
                        min={1}
                        value={durationSeconds}
                        onChange={(event) => setDurationSeconds(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Steps</span>
                      <input
                        type="number"
                        min={1}
                        value={steps}
                        onChange={(event) => setSteps(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Width</span>
                      <input
                        type="number"
                        min={64}
                        step={1}
                        value={width}
                        onChange={(event) => setWidth(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Height</span>
                      <input
                        type="number"
                        min={64}
                        step={1}
                        value={height}
                        onChange={(event) => setHeight(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                      />
                    </label>
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">CFG scale</span>
                    <input
                      type="number"
                      min={1}
                      step={0.1}
                      value={cfgScale}
                      onChange={(event) => setCfgScale(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Prompt</span>
                  <textarea
                    rows={6}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    className="w-full resize-y rounded-3xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                    placeholder="Describe the speaking style, framing, mood, and background."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Negative prompt</span>
                  <textarea
                    rows={5}
                    value={negativePrompt}
                    onChange={(event) => setNegativePrompt(event.target.value)}
                    className="w-full resize-y rounded-3xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Ready to generate.</p>
                  <p>
                    The request will save the ComfyUI URL, submit the image, and start polling the backend immediately.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Generate video'}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-6 rounded-4xl border border-white/70 bg-white/75 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Live monitor</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Generation status</h2>
              </div>
              {activeJob ? (
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">{formatStatus(activeJob.status)}</span>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              {activeJob ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Job {activeJob.job_id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-500">
                        {activeJob.total_segments > 0
                          ? `Segment ${currentSegment} of ${activeJob.total_segments}`
                          : 'Waiting for backend progress'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{progressPercent}%</p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-950 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatStatus(activeJob.status)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Segments</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{activeJob.total_segments || estimatedSegments}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Artifacts</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{activeJob.segment_urls?.length || 0} live preview(s)</p>
                    </div>
                  </div>

                  {activeJob.error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                      {activeJob.error}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No job yet. Submit a generation to see live progress here.
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Live logs</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-950">Pipeline trace</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{activeJob?.logs.length || 0} lines</span>
              </div>

              <div className="max-h-72 overflow-auto rounded-[1.25rem] bg-slate-50 px-4 py-3 font-mono text-[12px] leading-5 text-slate-100">
                {(activeJob?.logs || []).length > 0 ? (
                  (activeJob?.logs || []).map((log) => (
                    <div key={`${log.ts}-${log.message}`} className="mb-1 flex gap-3 last:mb-0">
                      <span className="shrink-0 text-slate-400">{formatTime(log.ts)}</span>
                      <span className="shrink-0 uppercase tracking-[0.18em] text-slate-500">{log.level}</span>
                      <span className="min-w-0 flex-1 wrap-break-word text-slate-800">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400">Logs will appear here as the backend segments progress.</div>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Video previews</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-950">Segments and final output</h3>
                </div>
                {activeJob?.download_url ? (
                  <a
                    href={joinUrl(apiBase, activeJob.download_url)}
                    className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Download MP4
                  </a>
                ) : null}
              </div>

              {activeJob?.download_url ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
                  <video key={activeJob.download_url} controls className="aspect-video w-full bg-black" src={joinUrl(apiBase, activeJob.download_url)} />
                  <div className="border-t border-white/10 p-4 text-sm text-slate-300">
                    Final stitched video is ready.
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  The final MP4 will appear here when generation finishes.
                </div>
              )}

              {activeJob?.segment_urls?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeJob.segment_urls.map((segmentUrl, index) => (
                    <a
                      key={segmentUrl}
                      href={joinUrl(apiBase, segmentUrl)}
                      className="group overflow-hidden rounded-[1.35rem] border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                    >
                      <div className="border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">Segment {index + 1}</p>
                          <span className="text-xs text-slate-500">preview</span>
                        </div>
                      </div>
                      <video
                        controls
                        muted
                        playsInline
                        className="aspect-video w-full bg-black"
                        src={joinUrl(apiBase, segmentUrl)}
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent jobs</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-950">History</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{jobs.length} total</span>
              </div>

              {jobs.length > 0 ? (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <button
                      key={job.job_id}
                      type="button"
                      onClick={() => setSelectedJobId(job.job_id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${selectedJobId === job.job_id ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-white'}`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{job.job_id.slice(0, 8)}</p>
                        <p className={`text-xs ${selectedJobId === job.job_id ? 'text-slate-300' : 'text-slate-500'}`}>
                          {formatStatus(job.status)} · {job.total_segments || 0} segment{job.total_segments === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${selectedJobId === job.job_id ? 'bg-white/10 text-white' : 'bg-white text-slate-600'}`}>
                        {job.progress}/{job.total_segments || 0}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Completed jobs will stay here for quick review.
                </div>
              )}
            </div>
          </section>
        </div>

        {statusMessage || errorMessage ? (
          <div className="fixed bottom-5 left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 px-4 sm:w-auto">
            <div className={`rounded-full border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${errorMessage ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
              {errorMessage || statusMessage}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default App