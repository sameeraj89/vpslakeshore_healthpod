import { useState, useRef } from 'react'
import { useApp } from '../../lib/store'
import { Camera, Upload, X, Image } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ImageUpload({ patient, screeningId, label }) {
  const { uploadImage, showToast } = useApp()
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const cameraRef = useRef()

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  const MAX_SIZE_MB = 10

  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true)
    for (const file of files) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        showToast(`${file.name} is too large (max ${MAX_SIZE_MB}MB)`, 'error')
        continue
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        showToast(`${file.name} is not a supported image type (JPG, PNG, WebP only)`, 'error')
        continue
      }
      try {
        const path = await uploadImage(file, patient.id)
        await supabase.from('screening_images').insert({
          patient_id: patient.id,
          screening_id: screeningId,
          file_path: path,
          file_name: file.name,
        })
        const url = URL.createObjectURL(file)
        setImages(prev => [...prev, { url, name: file.name, path }])
        showToast('Image uploaded')
      } catch {
        showToast('Image upload failed', 'error')
      }
    }
    setUploading(false)
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="form-label">{label || 'Clinical Images'}</label>

      {/* Uploaded images */}
      {images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {images.map((img, i) => (
            <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
              <img src={img.url} alt={img.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <button
                onClick={() => removeImage(i)}
                style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                aria-label="Remove image"
              >
                <X size={12} color="white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.875rem' }}
        >
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Upload File'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.875rem' }}
        >
          <Camera size={14} />
          Take Photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
      {images.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
          <Image size={13} />
          No images yet
        </div>
      )}
    </div>
  )
}
