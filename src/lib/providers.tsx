import { Cloud, Server, HardDrive, Folder } from 'lucide-react'

export const getProviderInfo = (item: any) => {
  const typeName = item.type_name || ''
  const uri = item.uri || ''

  if (typeName.includes('s3') || uri.startsWith('s3://')) {
    return { label: 'S3', icon: Cloud, color: 'text-blue-400', id: 's3' }
  }
  if (typeName.includes('stash') || typeName.includes('remote')) {
    return {
      label: 'Stash',
      icon: Server,
      color: 'text-orange-400',
      id: 'stash',
    }
  }
  if (typeName.includes('directory') || uri.startsWith('/')) {
    return {
      label: 'Local',
      icon: HardDrive,
      color: 'text-emerald-400',
      id: 'local',
    }
  }
  return {
    label: 'Unknown',
    icon: Folder,
    color: 'text-muted-foreground',
    id: 'unknown',
  }
}
