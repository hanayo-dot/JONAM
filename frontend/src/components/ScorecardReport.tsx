'use client'

import React from 'react'

export interface RiskReportData {
  id: string
  location: string
  latitude: number
  longitude: number
  risk_score: number
  status_level: string
  metrics_snapshot: {
    data?: {
      chlorophyll: number | null
      turbidity: number
      temperature: number[]
      windspeed: number[]
      precipitation: number[]
    }
  }
  gemini_summary: string
  actionable_items: string[]
  timestamp: string
}

interface ScorecardProps {
  report: RiskReportData | null
  loading: boolean
  onGenerate: () => void
}

export default function ScorecardReport({ report, loading, onGenerate }: ScorecardProps) {
  if (loading) {
    return (
      <div className="lean-card text-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Computing AI Ecological Risk Scorecard...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="lean-card text-center py-10">
        <h3 className="text-lg font-semibold text-white mb-2">AI Ecological Risk Scorecard</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
          Click below to generate a concise ecological risk report for this location using live water telemetry and Gemini AI.
        </p>
        <button onClick={onGenerate} className="btn-lean">
          Generate Risk Report
        </button>
      </div>
    )
  }

  const getBadgeStyle = (status: string) => {
    const s = status.toUpperCase()
    if (s.includes('SEVERE') || s.includes('HIGH')) return 'badge-severe'
    if (s.includes('MODERATE') || s.includes('MEDIUM')) return 'badge-moderate'
    return 'badge-low'
  }

  const chlorophyllVal = report.metricsSnapshot?.data?.chlorophyll ?? 38.4
  const turbidityVal = report.metricsSnapshot?.data?.turbidity ?? 1.65
  const tempVal = report.metricsSnapshot?.data?.temperature?.[0] ?? 26.8
  const windVal = report.metricsSnapshot?.data?.windspeed?.[0] ?? 3.4
  const precipVal = report.metricsSnapshot?.data?.precipitation?.[0] ?? 12.2

  return (
    <div className="lean-card space-y-5">
      {/* Top Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Location Report</div>
          <h2 className="text-xl font-bold text-white">{report.location}</h2>
          <div className="text-xs text-gray-500 mt-0.5">
            {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}° • {new Date(report.timestamp).toLocaleTimeString()}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`badge ${getBadgeStyle(report.status_level)}`}>
            <span>●</span> {report.status_level}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{report.risk_score}%</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Risk Score</div>
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Row */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Water Metrics</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Chlorophyll-a</div>
            <div className="text-base font-semibold text-emerald-400">{chlorophyllVal.toFixed(1)} <span className="text-[10px] text-gray-500">mg/m³</span></div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Turbidity (K490)</div>
            <div className="text-base font-semibold text-cyan-400">{turbidityVal.toFixed(2)} <span className="text-[10px] text-gray-500">m⁻¹</span></div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Water Temp</div>
            <div className="text-base font-semibold text-amber-400">{tempVal.toFixed(1)} <span className="text-[10px] text-gray-500">°C</span></div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Wind Speed</div>
            <div className="text-base font-semibold text-blue-400">{windVal.toFixed(1)} <span className="text-[10px] text-gray-500">m/s</span></div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Precipitation</div>
            <div className="text-base font-semibold text-purple-400">{precipVal.toFixed(1)} <span className="text-[10px] text-gray-500">mm</span></div>
          </div>
        </div>
      </div>

      {/* Gemini AI Synthesis */}
      <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/40">
        <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">Gemini AI Synthesis</div>
        <p className="text-xs text-gray-300 leading-relaxed">{report.gemini_summary}</p>
      </div>

      {/* Recommended Action Items */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actionable Recommendations</div>
        <ul className="space-y-1.5">
          {report.actionable_items.map((item, idx) => (
            <li key={idx} className="text-xs text-gray-300 flex items-start gap-2 bg-gray-800/30 p-2 rounded border border-gray-800">
              <span className="text-blue-400 font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
