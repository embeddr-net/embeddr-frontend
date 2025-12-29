import { TriangleAlertIcon } from 'lucide-react'

const NotFoundPage = () => {
  return (
    <div className="w-full p-1 h-full items-center justify-center flex flex-col">
      <div className="flex items-center justify-center border border-foreground/10 w-full h-full bg-card flex-col gap-3">
        <TriangleAlertIcon className="w-8 h-8 text-red-400" />
        <span>404 - Not Found</span>
      </div>
    </div>
  )
}

export default NotFoundPage
