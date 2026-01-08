import { useExternalNav } from '@embeddr/react-ui/hooks'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import { IconBrandGithub } from '@tabler/icons-react'
import { AlarmClockIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@embeddr/react-ui/components/button'

const ComingSoonPage = () => {
  const { openExternal } = useExternalNav()
  return (
    <div className="w-full p-1 h-full items-center justify-center flex flex-col">
      <div className="flex items-center justify-center border border-foreground/10 w-full h-full bg-card flex-col gap-3"></div>
    </div>
  )
}

export default ComingSoonPage
