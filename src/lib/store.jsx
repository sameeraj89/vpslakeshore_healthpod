import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { coerceUUIDs } from './utils'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [patients, setPatients] = useState([])
  const [screenings, setScreenings] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchPatients = useCallback(async (filters = {}) => {
    setLoading(true)
    let query = supabase.from('patients').select('*').order('created_at', { ascending: false })
    if (filters.search) query = query.ilike('name', `%${filters.search}%`)
    if (filters.gender) query = query.eq('gender', filters.gender)
    if (filters.risk_level) query = query.eq('risk_level', filters.risk_level)
    if (filters.camp_name) query = query.eq('camp_name', filters.camp_name)
    const { data, error } = await query.limit(2000)
    setLoading(false)
    if (!error && data) setPatients(data)
    return data || []
  }, [])

  const fetchScreenings = useCallback(async () => {
    const { data } = await supabase.from('screenings').select('*').order('created_at', { ascending: false })
    if (data) setScreenings(data)
    return data || []
  }, [])

  const savePatient = useCallback(async (patientData) => {
    const { data, error } = await supabase.from('patients').insert([coerceUUIDs(patientData)]).select().single()
    if (error) throw error
    setPatients(prev => [data, ...prev])
    return data
  }, [])

  const updatePatient = useCallback(async (id, updates) => {
    const { data, error } = await supabase.from('patients').update(coerceUUIDs(updates)).eq('id', id).select().single()
    if (error) throw error
    setPatients(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  const saveRiskAssessment = useCallback(async (assessmentData) => {
    const { data, error } = await supabase
      .from('risk_assessments')
      .upsert([assessmentData], { onConflict: 'patient_id' })
      .select()
      .single()
    if (error) throw error
    return data
  }, [])

  const saveScreening = useCallback(async (screeningData) => {
    const { data, error } = await supabase.from('screenings').upsert([coerceUUIDs(screeningData)], { onConflict: 'patient_id,cancer_type' }).select().single()
    if (error) throw error
    setScreenings(prev => {
      const idx = prev.findIndex(s => s.patient_id === screeningData.patient_id && s.cancer_type === screeningData.cancer_type)
      if (idx >= 0) { const updated = [...prev]; updated[idx] = data; return updated }
      return [data, ...prev]
    })
    return data
  }, [])

  const uploadImage = useCallback(async (file, patientId) => {
    const ext = file.name.split('.').pop()
    const path = `${patientId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('screening-images').upload(path, file)
    if (error) throw error
    return path
  }, [])

  const getImageUrl = useCallback(async (path) => {
    if (!path) return null
    const { data, error } = await supabase.storage.from('screening-images').createSignedUrl(path, 3600)
    if (error) return null
    return data?.signedUrl
  }, [])

  return (
    <AppContext.Provider value={{
      user, setUser,
      patients, screenings,
      loading,
      toast, showToast,
      fetchPatients, fetchScreenings,
      savePatient, updatePatient,
      saveRiskAssessment, saveScreening,
      uploadImage, getImageUrl,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
