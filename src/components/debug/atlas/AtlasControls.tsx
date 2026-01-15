import React, { useState } from 'react'
import {
  Badge,
  Button,
  Input,
  Label,
  ScrollArea,
  Separator,
  Slider,
  Spinner,
  Switch,
} from '@embeddr/react-ui'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Search,
  Settings2,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { Point3D, SearchResult } from './types'

interface AtlasControlsProps {
  isSettingsFolded: boolean
  setIsSettingsFolded: (v: boolean) => void
  pointsCount: number
  isBackendLoading: boolean
  focusMode: boolean
  setFocusMode: (v: boolean) => void
  useBackend: boolean
  setUseBackend: (v: boolean) => void
  filterCollection: string
  setFilterCollection: (v: string) => void
  collections: any[]
  searchQuery: string
  setSearchQuery: (v: string) => void
  handleSearch: () => void
  activeSearches: SearchResult[]
  removeSearch: (id: string) => void
  clearSearches: () => void
  onPointSelect: (p: Point3D) => void
  points: Point3D[]
  depth: number[]
  setDepth: (v: number[]) => void
  pointSize: number[]
  setPointSize: (v: number[]) => void
  showSettings: boolean
  setShowSettings: (v: boolean) => void
  nNeighbors: number[]
  setNNeighbors: (v: number[]) => void
  minDist: number[]
  setMinDist: (v: number[]) => void
  spread: number[]
  setSpread: (v: number[]) => void
  onClearCache: () => void
  onRefresh: () => void
}

const UMAP_PRESETS = {
  default: { neighbors: 15, dist: 0.1, spread: 1.0 },
  clustered: { neighbors: 50, dist: 0.05, spread: 0.5 },
  loose: { neighbors: 5, dist: 0.5, spread: 2.0 },
}

export const AtlasControls: React.FC<AtlasControlsProps> = ({
  isSettingsFolded,
  setIsSettingsFolded,
  pointsCount,
  isBackendLoading,
  focusMode,
  setFocusMode,
  useBackend,
  setUseBackend,
  filterCollection,
  setFilterCollection,
  collections,
  searchQuery,
  setSearchQuery,
  handleSearch,
  activeSearches,
  removeSearch,
  clearSearches,
  onPointSelect,
  points,
  depth,
  setDepth,
  pointSize,
  setPointSize,
  showSettings,
  setShowSettings,
  nNeighbors,
  setNNeighbors,
  minDist,
  setMinDist,
  spread,
  setSpread,
  onClearCache,
  onRefresh,
}) => {
  return (
    <div
      className={`absolute top-2 left-2 z-10 bg-background/80 p-2 backdrop-blur border pointer-events-auto transition-all duration-200 overflow-hidden flex flex-col ${
        isSettingsFolded ? 'w-10 h-10' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between">
        {!isSettingsFolded && (
          <h3 className="text-xs font-bold px-1">Vector Atlas</h3>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto"
          onClick={() => setIsSettingsFolded(!isSettingsFolded)}
        >
          {isSettingsFolded ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </Button>
      </div>

      {!isSettingsFolded && (
        <div className="mt-2 space-y-2">
          <p className="text-[10px] text-muted-foreground pb-2 flex items-center gap-2 px-1">
            Visualizing {pointsCount} artifacts in latent space.
            {isBackendLoading && <Spinner className="w-3 h-3" />}
          </p>
          <div className="flex items-center justify-between mt-2 border-t pt-2 gap-2 px-1">
            <Label htmlFor="focus-mode" className="text-[10px] font-medium">
              Shake Tree (Focus)
            </Label>
            <Switch
              id="focus-mode"
              checked={focusMode}
              onCheckedChange={setFocusMode}
              className="scale-75 origin-right"
            />
          </div>

          <div className="flex items-center justify-between mt-1 gap-2 px-1">
            <Label htmlFor="backend-mode" className="text-[10px] font-medium">
              Server Projection
            </Label>
            <Switch
              id="backend-mode"
              checked={useBackend}
              onCheckedChange={setUseBackend}
              className="scale-75 origin-right"
            />
          </div>

          <div className="space-y-2 mt-2 border-t pt-2 px-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-medium">Collection</Label>
              <select
                className="w-full bg-background border border-border rounded text-[10px] p-1 h-6"
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
              >
                <option value="all">All</option>
                {collections.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.label || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-medium">Search</Label>
              <div className="flex gap-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-6 text-[10px] px-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleSearch}
                >
                  <Search className="w-3 h-3" />
                </Button>
              </div>
              {activeSearches.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {activeSearches.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center text-[9px] bg-muted/50 p-1 rounded"
                    >
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:opacity-80 flex-1"
                        onClick={() => {
                          const p = points.find((p) => p.id === s.id)
                          if (p) onPointSelect(p)
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span
                          className="truncate max-w-[100px]"
                          title={s.query}
                        >
                          {s.query}
                        </span>
                        <span className="text-muted-foreground">
                          ({s.items.length})
                        </span>
                      </div>
                      <span
                        className="cursor-pointer hover:text-destructive px-1"
                        onClick={() => removeSearch(s.id)}
                      >
                        ×
                      </span>
                    </div>
                  ))}
                  <div
                    className="text-[9px] text-right text-muted-foreground cursor-pointer hover:text-primary mt-1"
                    onClick={clearSearches}
                  >
                    Clear All
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-[10px] font-medium">
              Depth: {depth[0] === 10 ? 'Full' : depth[0]}
            </span>
            <Slider
              value={depth}
              onValueChange={setDepth}
              min={1}
              max={10}
              step={1}
              className="w-24 ml-auto"
            />
          </div>
          <div className="flex items-center gap-2 mt-1 px-1">
            <span className="text-[10px] font-medium w-8">
              Size: {pointSize[0]}
            </span>
            <Slider
              value={pointSize}
              onValueChange={setPointSize}
              min={0.05}
              max={1.0}
              step={0.05}
              className="w-24 ml-auto"
            />
          </div>

          <Button
            size="sm"
            variant={showSettings ? 'secondary' : 'ghost'}
            className="h-6 text-xs mt-2 w-full"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="w-3 h-3 mr-1" /> UMAP Settings
          </Button>

          {showSettings && (
            <div className="pt-2 mt-2 border-t space-y-2 bg-muted/20 p-1 ">
              <div className="grid grid-cols-3 gap-1 mb-2">
                {Object.entries(UMAP_PRESETS).map(([key, config]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="icon"
                    className="w-full h-5 text-[9px] uppercase"
                    onClick={() => {
                      setNNeighbors([config.neighbors])
                      setMinDist([config.dist])
                      setSpread([config.spread])
                    }}
                    title={`Set to ${key} preset`}
                  >
                    {key.slice(0, 4)}
                  </Button>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span>Neighbors</span>
                  <span>{nNeighbors[0]}</span>
                </div>
                <Slider
                  value={nNeighbors}
                  onValueChange={setNNeighbors}
                  min={2}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span>Min Dist</span>
                  <span>{minDist[0]}</span>
                </div>
                <Slider
                  value={minDist}
                  onValueChange={setMinDist}
                  min={0.0}
                  max={2.0}
                  step={0.05}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span>Spread</span>
                  <span>{spread[0]}</span>
                </div>
                <Slider
                  value={spread}
                  onValueChange={setSpread}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                />
              </div>
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs mt-2 w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={onClearCache}
          >
            Clear Cache & Project
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs mt-1 w-full"
            onClick={onRefresh}
          >
            <RefreshCcw className="w-3 h-3 mr-1" />
            Refresh Data
          </Button>
        </div>
      )}
    </div>
  )
}
