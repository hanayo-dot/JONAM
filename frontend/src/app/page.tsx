'use client'

import React, { useState, useEffect, useRef } from 'react'
import ScorecardReport, { RiskReportData } from '@/components/ScorecardReport'
import AIChatDrawer from '@/components/AIChatDrawer'

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState({ name: 'Kisumu Bay, Kenya', lat: -0.1022, lon: 34.7617 })
  const [report, setReport] = useState<RiskReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)

  const loadScorecard = async (loc = selectedLocation) => {
    setLoading(true)
    try {
      const metricsRes = await fetch(`/api/water-metrics?lat=${loc.lat}&lon=${loc.lon}`)
      const metricsData = await metricsRes.json()

      const scorecardRes = await fetch('/api/agent/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc.name, latitude: loc.lat, longitude: loc.lon, metrics: metricsData })
      })
      const data = await scorecardRes.json()
      setReport(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScorecard()
  }, [])

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">JONAM</h1>
          <p className="text-xs text-gray-400">Lake Victoria Hyacinth & Agro-Climate AI Monitor</p>
        </div>

        <button onClick={() => setIsChatOpen(true)} className="btn-lean">
          AI Assistant Chat
        </button>
      </header>

      {/* Interactive Map */}
      <section className="lean-card space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Interactive Lake Victoria Map (Click anywhere to analyze coordinates)
        </div>
        <div ref={mapRef} className="h-80 w-full rounded-lg border border-gray-700"></div>
      </section>

      {/* Main Scorecard Report */}
      <section>
        <ScorecardReport
          report={report}
          loading={loading}
          onGenerate={() => loadScorecard()}
        />
      </section>

      {/* AI Chat Drawer */}
      <AIChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </main>
  )
}
