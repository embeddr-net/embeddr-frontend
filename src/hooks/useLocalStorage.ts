import { useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get from local storage then
  // parse stored json or if none return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.log(error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        // Use a more specific event to avoid waking up every single hook
        window.dispatchEvent(
          new CustomEvent('local-storage-update', { detail: { key } }),
        )
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      // If it's a CustomEvent, only update if the key matches
      if (e.type === 'local-storage-update' && e.detail?.key !== key) {
        return
      }

      try {
        const item = window.localStorage.getItem(key)
        const newValue = item ? JSON.parse(item) : initialValue

        // Only update state if it actually changed to prevent render loops
        setStoredValue((current) => {
          if (JSON.stringify(current) === JSON.stringify(newValue))
            return current
          return newValue
        })
      } catch (error) {
        console.log(error)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('local-storage-update', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage-update', handleStorageChange)
    }
  }, [key, initialValue])

  return [storedValue, setValue] as const
}
