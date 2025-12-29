import { Button, Switch, useExternalNav } from '@embeddr/react-ui'
import { IconBrandGithub } from '@tabler/icons-react'
import { AlarmClockIcon } from 'lucide-react'
import { toast } from 'sonner'

const ComingSoonPage = () => {
  const { openExternal } = useExternalNav()
  return (
    <div className="w-full p-1 h-full items-center justify-center flex flex-col">
      <div className="flex items-center justify-center border border-foreground/10 w-full h-full bg-card flex-col gap-3">
        <AlarmClockIcon
          className="w-8 h-8 text-yellow-400 cursor-pointer"
          onClick={() => toast('Beep boop', { icon: '🤖' })}
        />
        <span>This feature is coming soon!</span>
        <span className="flex items-center gap-2">
          {' '}
          Check the{' '}
          <Button
            variant="default"
            onClick={() => openExternal('https://github.com/nynxz/embeddr')}
          >
            <IconBrandGithub /> GitHub
          </Button>{' '}
          for updates.
        </span>
      </div>
    </div>
  )
}

export default ComingSoonPage
