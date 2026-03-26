import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@embeddr/react-ui/ui'
import { Card } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { Separator } from '@embeddr/react-ui/ui'
import {
  Check,
  Upload,
  Key,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileImage,
  X,
} from 'lucide-react'
import { embeddrApi } from '@/lib/api/client'
import type { Artifact, PublicSystemInfo } from '@/lib/api/types'

interface CloudOnboardingProps {
  publicInfo: PublicSystemInfo
  onComplete: () => void
}

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'lotus', label: 'Try Lotus', icon: Sparkles },
  { id: 'done', label: 'Explore', icon: Check },
] as const

type StepId = (typeof STEPS)[number]['id']

export function CloudOnboarding({
  publicInfo,
  onComplete,
}: CloudOnboardingProps) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<StepId>('welcome')
  const [uploadedArtifact, setUploadedArtifact] = useState<Artifact | null>(
    null,
  )
  const [claudeKey, setClaudeKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [lotusResult, setLotusResult] = useState<string | null>(null)

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id)
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <Card className="mx-auto w-full max-w-2xl p-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isDone = i < currentIndex
            return (
              <div key={step.id} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => i <= currentIndex && setCurrentStep(step.id)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-primary/20 text-primary cursor-pointer'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 ${isDone ? 'bg-primary/40' : 'bg-border'}`}
                  />
                )}
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Step content */}
        {currentStep === 'welcome' && (
          <WelcomeStep
            publicInfo={publicInfo}
            onNext={goNext}
            onSkip={onComplete}
          />
        )}
        {currentStep === 'upload' && (
          <UploadStep
            onUploaded={(artifact) => {
              setUploadedArtifact(artifact)
              goNext()
            }}
            onNext={goNext}
            onBack={goBack}
            uploadedArtifact={uploadedArtifact}
          />
        )}
        {currentStep === 'keys' && (
          <KeysStep
            claudeKey={claudeKey}
            setClaudeKey={setClaudeKey}
            openrouterKey={openrouterKey}
            setOpenrouterKey={setOpenrouterKey}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 'lotus' && (
          <LotusStep
            artifact={uploadedArtifact}
            lotusResult={lotusResult}
            setLotusResult={setLotusResult}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 'done' && (
          <DoneStep onComplete={onComplete} navigate={navigate} />
        )}
      </Card>
    </div>
  )
}

/* ─── Step 1: Welcome ───────────────────────────────────────────────── */

function WelcomeStep({
  publicInfo,
  onNext,
  onSkip,
}: {
  publicInfo: PublicSystemInfo
  onNext: () => void
  onSkip: () => void
}) {
  const instanceName = publicInfo.instance?.name || 'Embeddr'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Your workspace is ready</h2>
        <p className="text-sm text-muted-foreground">
          Welcome to {instanceName}. Let's walk through a few steps to make sure
          everything is working.
        </p>
      </div>

      <Card className="bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-3">
          {publicInfo.instance?.logo_url ? (
            <img
              src={publicInfo.instance.logo_url}
              alt="Logo"
              className="h-10 w-10 rounded-md object-contain bg-background"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
              E
            </div>
          )}
          <div>
            <div className="font-medium">{instanceName}</div>
            {publicInfo.instance?.description && (
              <div className="text-xs text-muted-foreground">
                {publicInfo.instance.description}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>This setup will:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Upload a file to verify cloud storage</li>
          <li>Optionally configure inference API keys</li>
          <li>Run a quick Lotus action to test the pipeline</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSkip}>
          Skip setup
        </Button>
        <Button onClick={onNext}>
          Get started <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 2: Upload ────────────────────────────────────────────────── */

function UploadStep({
  onUploaded,
  onNext,
  onBack,
  uploadedArtifact,
}: {
  onUploaded: (artifact: Artifact) => void
  onNext: () => void
  onBack: () => void
  uploadedArtifact: Artifact | null
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: async (file: File) => {
      // 1. Create artifact record
      const artifact = await embeddrApi.artifacts.create({
        type_name: file.type.startsWith('image/') ? 'image' : 'file',
        base_type_name: 'artifact',
        metadata_json: {
          original_filename: file.name,
          size_bytes: file.size,
          mime_type: file.type,
        },
      })

      // 2. Init upload — gets upload_id (ingest record) and optional upload_path
      const init = await embeddrApi.lotus.invoke<{
        upload_id?: string
        upload_path?: string
      }>('embeddr-core.artifact.upload.init', {
        artifact_id: artifact.id,
        filename: file.name,
        content_type: file.type || undefined,
        size: file.size,
        confirm: true,
      })

      const uploadId = init?.upload_id
      const uploadPath = init?.upload_path
      if (!uploadId) throw new Error('Upload init failed — no upload_id returned')

      // 3. Upload bytes (cloud storage plugin provides upload_path for direct R2 upload)
      if (uploadPath) {
        await embeddrApi.artifacts.uploadToPath(uploadPath, file)
      } else {
        await embeddrApi.artifacts.uploadFile(uploadId, file)
      }

      // 4. Complete
      await embeddrApi.lotus.invoke('embeddr-core.artifact.upload.complete', {
        upload_id: uploadId,
        confirm: true,
      })

      return artifact
    },
    onSuccess: (artifact) => {
      setError(null)
      onUploaded(artifact)
    },
    onError: (err: Error) => {
      setError(err.message || 'Upload failed')
    },
  })

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const file = files[0]
      if (file) {
        upload.mutate(file)
      }
    },
    [upload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer?.files?.length) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  if (uploadedArtifact) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Upload complete</h2>
          <p className="text-sm text-muted-foreground">
            Your file was stored in the cloud successfully.
          </p>
        </div>

        <Card className="bg-emerald-500/10 border-emerald-500/30 p-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-sm font-medium">
                {(uploadedArtifact.metadata_json as any)?.original_filename ||
                  uploadedArtifact.id}
              </div>
              <div className="text-xs text-muted-foreground">
                Cloud storage verified
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button onClick={onNext}>
            Continue <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Upload your first artifact</h2>
        <p className="text-sm text-muted-foreground">
          Drop a file here to verify that cloud storage is working. Images work
          best for testing Lotus later.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        {upload.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileImage className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a file here
            </p>
            <span className="text-xs text-muted-foreground">or</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files
                  if (files?.length) handleFiles(files)
                }
                input.click()
              }}
            >
              Browse files
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button variant="ghost" onClick={onNext}>
          Skip
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 3: API Keys ──────────────────────────────────────────────── */

function KeysStep({
  claudeKey,
  setClaudeKey,
  openrouterKey,
  setOpenrouterKey,
  onNext,
  onBack,
}: {
  claudeKey: string
  setClaudeKey: (v: string) => void
  openrouterKey: string
  setOpenrouterKey: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!claudeKey && !openrouterKey) {
      onNext()
      return
    }

    setSaving(true)
    setError(null)
    try {
      const value: Record<string, string> = {}
      if (claudeKey) value.anthropic_api_key = claudeKey
      if (openrouterKey) value.openrouter_api_key = openrouterKey

      await embeddrApi.config.put('embeddr-cloud-inference', {
        value,
        scope: 'global',
      })
      setSaved(true)
      setTimeout(() => onNext(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to save keys')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Set up inference</h2>
        <p className="text-sm text-muted-foreground">
          Add API keys so Lotus can run AI actions on your artifacts. This is
          optional — you can add keys later in settings.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide">
            Anthropic (Claude) API key
          </label>
          <Input
            type="password"
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="sk-ant-..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide">
            OpenRouter API key
          </label>
          <Input
            type="password"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            placeholder="sk-or-..."
          />
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-500">
          <Check className="h-4 w-4" />
          Keys saved
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onNext}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : claudeKey || openrouterKey ? (
              <>
                Save keys <ArrowRight className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Step 4: Try Lotus ─────────────────────────────────────────────── */

function LotusStep({
  artifact,
  lotusResult,
  setLotusResult,
  onNext,
  onBack,
}: {
  artifact: Artifact | null
  lotusResult: string | null
  setLotusResult: (v: string | null) => void
  onNext: () => void
  onBack: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  // Find describe-like actions
  const { data: capsData } = useQuery({
    queryKey: ['lotus', 'capabilities', 'cloud-onboarding'],
    queryFn: () => embeddrApi.lotus.list({ kind: 'action', limit: 200 }),
    staleTime: 30_000,
  })

  const describeAction = useMemo(() => {
    const caps = capsData?.items || []
    return caps.find((cap: any) => {
      const title = String(cap.title || cap.id || '').toLowerCase()
      return (
        title.includes('describe') ||
        title.includes('caption') ||
        title.includes('analyze')
      )
    })
  }, [capsData])

  const invoke = useMutation({
    mutationFn: async () => {
      if (!describeAction || !artifact) {
        throw new Error('No describe action or artifact available')
      }
      const result = await embeddrApi.lotus.invoke<any>(describeAction.id, {
        artifact_id: artifact.id,
      })
      return result
    },
    onSuccess: (data: any) => {
      const text =
        data?.result?.text ||
        data?.result?.description ||
        data?.text ||
        data?.description ||
        JSON.stringify(data?.result || data, null, 2)
      setLotusResult(text)
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || 'Lotus action failed')
    },
  })

  const canRun = artifact && describeAction

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Try Lotus</h2>
        <p className="text-sm text-muted-foreground">
          {artifact
            ? "Run an AI action on your uploaded artifact to verify the inference pipeline."
            : "You skipped the upload step. You can still try Lotus later from the main app."}
        </p>
      </div>

      {artifact && (
        <Card className="bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <FileImage className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium">
                {(artifact.metadata_json as any)?.original_filename ||
                  artifact.id}
              </span>
              {describeAction ? (
                <span className="text-muted-foreground">
                  {' '}
                  — using{' '}
                  <span className="font-medium">
                    {(describeAction as any).title || (describeAction as any).id}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {' '}
                  — no describe action found (add API keys first)
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {canRun && !lotusResult && (
        <Button
          onClick={() => invoke.mutate()}
          disabled={invoke.isPending}
          className="w-full"
        >
          {invoke.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Describe this artifact
            </>
          )}
        </Button>
      )}

      {lotusResult && (
        <Card className="bg-emerald-500/10 border-emerald-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-500">
              Lotus is working
            </span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
            {lotusResult}
          </p>
        </Card>
      )}

      {error && (
        <Card className="bg-destructive/10 border-destructive/30 p-3">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <X className="h-4 w-4" />
            {error}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This usually means no API keys are configured or the inference
            plugin isn't loaded.
          </p>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext}>
          {lotusResult ? 'Continue' : 'Skip'}{' '}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 5: Done ──────────────────────────────────────────────────── */

function DoneStep({
  onComplete,
  navigate,
}: {
  onComplete: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-6 w-6 text-emerald-500" />
        </div>
        <h2 className="text-xl font-semibold">You're all set</h2>
        <p className="text-sm text-muted-foreground">
          Your workspace is configured and ready to use.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          variant="outline"
          className="h-auto flex-col gap-1 py-3"
          onClick={() => navigate({ to: '/search' })}
        >
          <span className="text-sm font-medium">Search</span>
          <span className="text-[10px] text-muted-foreground">
            Find artifacts
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-1 py-3"
          onClick={() => navigate({ to: '/lotus' })}
        >
          <span className="text-sm font-medium">Lotus</span>
          <span className="text-[10px] text-muted-foreground">
            AI actions
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-1 py-3"
          onClick={() => navigate({ to: '/settings', search: { tab: 'profile' } })}
        >
          <span className="text-sm font-medium">Settings</span>
          <span className="text-[10px] text-muted-foreground">
            Configure more
          </span>
        </Button>
      </div>

      <div className="flex justify-center">
        <Button onClick={onComplete}>
          Enter Embeddr <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
