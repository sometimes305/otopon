import type { SoundColor } from '../sounds'

export interface StoredSound {
  id: string
  label: string
  color: SoundColor
  blob: Blob
  createdAt: number
}

const DB_NAME = 'otopon'
const STORE_NAME = 'sounds'

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadCustomSounds(): Promise<StoredSound[]> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll()
    request.onsuccess = () => {
      database.close()
      resolve((request.result as StoredSound[]).sort((a, b) => a.createdAt - b.createdAt))
    }
    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function saveCustomSound(input: { label: string; color: SoundColor; file: File }): Promise<StoredSound> {
  const database = await openDatabase()
  const sound: StoredSound = {
    id: `custom-${crypto.randomUUID()}`,
    label: input.label,
    color: input.color,
    blob: input.file,
    createdAt: Date.now(),
  }
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(sound)
    request.onsuccess = () => {
      database.close()
      resolve(sound)
    }
    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}
