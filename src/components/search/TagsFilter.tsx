import { Button } from '@embeddr/react-ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import { Input } from '@embeddr/react-ui/components/input'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Search, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface TagsFilterProps {
  tags: Array<{ name: string; count: number }>
  selectedTags: Array<string>
  onToggleTag: (tag: string) => void
  onClearTags: () => void
  onSoloTag?: (tag: string) => void
}

export function TagsFilter({
  tags,
  selectedTags,
  onToggleTag,
  onClearTags,
  onSoloTag,
}: TagsFilterProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredTags = useMemo(() => {
    if (!search) return tags
    return tags.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [tags, search])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={selectedTags.length > 0 ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 gap-2 border-dashed"
        >
          <Tag className="h-4 w-4" />
          Tags
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 rounded-sm">
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] p-0">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          <div className="p-2 flex flex-wrap gap-1">
            {filteredTags.length === 0 && (
              <div className="w-full text-center text-sm text-muted-foreground py-4">
                No tags found
              </div>
            )}
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name)
              return (
                <Button
                  key={tag.name}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-7 text-xs px-2',
                    isSelected ? 'hover:bg-primary/90' : 'hover:bg-muted',
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if ((e.ctrlKey || e.metaKey) && onSoloTag) {
                      onSoloTag(tag.name)
                    } else {
                      onToggleTag(tag.name)
                    }
                  }}
                >
                  {tag.name}
                  <span
                    className={cn(
                      'ml-1.5 text-[10px]',
                      isSelected
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground',
                    )}
                  >
                    {tag.count}
                  </span>
                </Button>
              )
            })}
          </div>
        </ScrollArea>
        {selectedTags.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center h-8"
                onClick={() => {
                  onClearTags()
                }}
              >
                Clear filters
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
