import { describe, it, expect, beforeEach } from 'vitest'
import { useGlobalStore } from './globalStore'

describe('useGlobalStore', () => {
  beforeEach(() => {
    useGlobalStore.setState({ selectedImage: null })
  })

  it('should select image', () => {
    const image = {
      id: 'img1',
      url: 'http://example.com/img.jpg',
      width: 100,
      height: 100,
    }
    useGlobalStore.getState().selectImage(image)
    expect(useGlobalStore.getState().selectedImage).toEqual(image)
  })

  it('should clear selection', () => {
    const image = {
      id: 'img1',
      url: 'http://example.com/img.jpg',
      width: 100,
      height: 100,
    }
    useGlobalStore.setState({ selectedImage: image })

    useGlobalStore.getState().selectImage(null)
    expect(useGlobalStore.getState().selectedImage).toBeNull()
  })
})
