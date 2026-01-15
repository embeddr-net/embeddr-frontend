// Point3D type definition
// This should match what's used in the 3D visualizer
export interface Point3D {
  id: string | number
  x: number
  y: number
  z: number
  color: string
  label?: string
  // Optional metadata specific to our app
  metadata?: {
    type?: string
    uri?: string
    [key: string]: any
  }
  opacity?: number
}

export interface GraphEdge {
  source: string
  target: string
  type: 'parent' | 'child' | 'relation'
  label?: string
  depth: number
}

export interface SearchResult {
  id: string
  query: string
  items: string[] // artifact IDs
  color: string
}
