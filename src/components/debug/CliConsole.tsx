import { useState } from 'react'
import { embeddrApi } from '@/lib/api/v2/client'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Loader2, Terminal } from 'lucide-react'
import { Card } from '@embeddr/react-ui/components/card'

export const CliConsole = () => {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleRun = async () => {
    if (!input.trim()) return

    setLoading(true)
    const cmdArgs = input.split(' ') // Naive splitting, doesn't handle quotes well

    // Add to history optimistically
    const entryId = Date.now()
    setHistory((prev) => [
      ...prev,
      { id: entryId, type: 'input', content: input },
    ])
    setInput('')

    try {
      const res = await embeddrApi.system.runCommand(cmdArgs)

      setHistory((prev) => [
        ...prev,
        {
          id: entryId + 1,
          type: 'output',
          content:
            res.stdout || res.stderr || (res.success ? 'Success' : 'Failed'),
          isError: !res.success || !!res.stderr,
        },
      ])
    } catch (e) {
      setHistory((prev) => [
        ...prev,
        {
          id: entryId + 1,
          type: 'output',
          content: (e as Error).message,
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-sm p-4">
      <ScrollArea className="flex-1 mb-4 border border-green-900 rounded bg-green-950/20 p-4">
        {history.length === 0 && (
          <div className="text-green-800 italic">
            Embeddr CLI Web Console. Type a command (e.g. "process scan --help")
          </div>
        )}
        {history.map((entry) => (
          <div
            key={entry.id}
            className={`mb-2 ${entry.type === 'input' ? 'font-bold' : ''}`}
          >
            <span className="opacity-50 mr-2">
              {entry.type === 'input' ? '$ embeddr' : '>'}
            </span>
            <span className={entry.isError ? 'text-red-400' : ''}>
              {entry.content}
            </span>
          </div>
        ))}
      </ScrollArea>

      <div className="flex gap-2">
        <div className="flex items-center bg-muted/20 px-3 rounded text-muted-foreground select-none">
          $ embeddr
        </div>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          disabled={loading}
          className="flex-1 bg-transparent border-green-900 text-green-400 placeholder:text-green-900 focus-visible:ring-offset-0"
          placeholder="process scan..."
        />
        <Button
          onClick={handleRun}
          disabled={loading}
          variant="outline"
          className="border-green-900 text-green-400 hover:bg-green-900/20"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Terminal />}
        </Button>
      </div>
    </div>
  )
}
