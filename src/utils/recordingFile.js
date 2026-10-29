// Collects the recorded chunks and turns them into a downloadable file.
let chunks = []
let lastUrl = null

export const startFile = () => {
  chunks = []
  if (lastUrl) URL.revokeObjectURL(lastUrl)
  lastUrl = null
}

export const addChunk = (blob) => {
  chunks.push(blob)
}

export const downloadFile = ({ url, name }) => {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Builds the file and saves it to the Downloads folder.
// Returns { name, url, format, size }.
export const finishFile = (mimeType = '') => {
  const type = mimeType.split(';')[0] || 'video/webm'
  const ext = type.includes('mp4') ? 'mp4' : 'webm'
  const blob = new Blob(chunks, { type })
  chunks = []
  const file = {
    name: `lecture-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`,
    url: URL.createObjectURL(blob),
    format: ext === 'mp4' ? 'MP4' : 'WebM',
    size: blob.size
  }
  lastUrl = file.url
  downloadFile(file)
  return file
}
