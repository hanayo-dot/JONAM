'use client'

import React, { useState, useEffect } from 'react'
import ScorecardReport, { RiskReportData } from '@/components/ScorecardReport'
import AIChatDrawer from '@/components/AIChatDrawer'

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState('Kisumu Bay, Kenya')
  const [lat, setLat] = useState('-0.1022')
  const [lon, setLon] = useState('34.7617')
  const [metrics, setMetrics] = useState<any>(null)
  const [report, setReport] = useState<RiskReportData | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const hotspots = [
    { name: 'Kisumu Bay, Kenya', lat: '-0.1022', lon: '34.7617' },
    { name: 'Homa Bay, Kenya', lat: '-0.5273', lon: '34.4571' },
    { name: 'Jinja, Uganda', lat: '0.4244', lon: '33.2042' },
    { name: 'Entebbe, Uganda', lat: '0.0512', lon: '32.4637' }
  ]

  const loadWaterMetrics = async (latitude = lat, longitude = lon, locName = selectedLocation) => {
    setLoadingMetrics(true)
    try {
      const res = await fetch(`/api/water-metrics?lat=${latitude}&lon=${longitude}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMetrics(data)
      generateScorecardReport(locName, parseFloat(latitude), parseFloat(longitude), data)
    } catch (e: any) {
      console.error('Failed to load metrics:', e)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const generateScorecardReport = async (
    locName = selectedLocation,
    latitude = parseFloat(lat),
    longitude = parseFloat(lon),
    metricsData = metrics
  ) => {
    setLoadingReport(true)
    try {
      const res = await fetch('/api/agent/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locName,
          latitude,
          longitude,
          metrics: metricsData || {}
        })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setReport(data)
    } catch (e: any) {
      console.error('Failed to generate report:', e)
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    loadWaterMetrics()
  }, [])

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">JONAM</h1>
          <p className="text-xs text-gray-400">Lake Victoria Hyacinth & Ecological AI Monitor</p>
        </div>

        <button onClick={() => setIsChatOpen(true)} className="btn-lean">
          AI Assistant Chat
        </button>
      </header>

      {/* Hotspot Location Picker */}
      <section className="lean-card space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Location</div>
        <div className="flex flex-wrap gap-2">
          {hotspots.map(h => (
            <button
              key={h.name}
              onClick={() => {
                setSelectedLocation(h.name)
                setLat(h.lat)
                setLon(h.lon)
                loadWaterMetrics(h.lat, h.lon, h.name)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedLocation === h.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              📍 {h.name}
            </button>
          ))}
        </div>
      </section>

      {/* Main Scorecard Report */}
      <section>
        <ScorecardReport
          report={report}
          loading={loadingReport || loadingMetrics}
          onGenerate={() => generateScorecardReport()}
        />
      </section>

      {/* AI Chat Drawer */}
      <AIChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </main>
  )
}
