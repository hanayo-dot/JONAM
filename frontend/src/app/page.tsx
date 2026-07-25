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
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Hero Presentation Header */}
      <section className="presentation-card space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/60 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Pollution Risk Assessment Model
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Helping make informed decisions on <strong className="text-cyan-300">Hyacinth Control</strong> and <strong className="text-purple-300">Declining Fish Stock</strong> via Machine Learning Models.
            </p>
          </div>

          <button onClick={() => setIsChatOpen(true)} className="btn-action">
            💬 ML Decision Assistant
          </button>
        </header>

        {/* Dual Solution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 border-l-4 border-l-cyan-400">
            <div className="text-sm font-bold text-cyan-300 mb-1 flex items-center gap-2">
              🌿 1. Hyacinth Proliferation Control
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ML algorithms monitor satellite Chlorophyll-a and wind vectors to predict floating weed mat accumulation before it chokes harbors and water intake facilities.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 border-l-4 border-l-purple-400">
            <div className="text-sm font-bold text-purple-300 mb-1 flex items-center gap-2">
              🐟 2. Fish Stock Protection (Tilapia & Nile Perch)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Detects underwater light extinction (Turbidity K490) and hypoxia from decaying weed mats to safeguard critical fish breeding grounds and coastal fishing stock.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Map */}
      <section className="presentation-card space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Interactive Lake Victoria Spatial ML Map (Click any point to run inference)
        </div>
        <div ref={mapRef} className="h-96 w-full rounded-xl border border-slate-700"></div>
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
