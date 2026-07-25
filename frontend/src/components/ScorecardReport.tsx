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
    is_water?: boolean
    data?: {
      chlorophyll: number | null
      turbidity: number | null
      temperature: number[]
      windspeed: number[]
      precipitation: number[]
    }
  }
  agent_summary?: string
  gemini_summary?: string
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
        <p className="text-sm text-gray-400">Evaluating Telemetry & AI Agent Reasoning...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="lean-card text-center py-10">
        <h3 className="text-lg font-semibold text-white mb-2">AI Ecological Risk Scorecard</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
          Click any point on Lake Victoria to select coordinates and generate an ecological risk report.
        </p>
        <button onClick={onGenerate} className="btn-lean">
          Generate Risk Report
        </button>
      </div>
    )
  }

  const status = (report.status_level || '').toUpperCase()
  let badgeStyle = 'badge-low'
  if (status.includes('INLAND')) badgeStyle = 'badge-inland'
  else if (status.includes('SEVERE') || status.includes('HIGH')) badgeStyle = 'badge-severe'
  else if (status.includes('MODERATE') || status.includes('MEDIUM')) badgeStyle = 'badge-moderate'

  const isWater = report.metrics_snapshot?.is_water !== false && !status.includes('INLAND')
  const data = report.metrics_snapshot?.data || {}

  const chlorophyllVal = isWater && data.chlorophyll !== null ? data.chlorophyll.toFixed(1) : 'N/A'
  const turbidityVal = isWater && data.turbidity !== null ? data.turbidity.toFixed(2) : 'N/A'
  const tempVal = data.temperature && data.temperature[0] ? data.temperature[0].toFixed(1) : '24.0'
  const windVal = data.windspeed && data.windspeed[0] ? data.windspeed[0].toFixed(1) : '3.0'
  const precipVal = data.precipitation && data.precipitation[0] ? data.precipitation[0].toFixed(1) : '0.0'
  const summaryText = report.agent_summary || report.gemini_summary || ''

  return (
    <div className="lean-card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Location Report</div>
          <h2 className="text-xl font-bold text-white">{report.location}</h2>
          <div className="text-xs text-gray-500 mt-0.5">
            {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}° • {new Date(report.timestamp).toLocaleTimeString()}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`badge ${badgeStyle}`}>
            <span>●</span> {report.status_level}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{isWater ? report.risk_score + '%' : '0%'}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">{isWater ? 'Risk Score' : 'Land Point'}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Water Metrics</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Chlorophyll-a</div>
            <div className={`text-base font-semibold ${isWater ? 'text-emerald-400' : 'text-gray-400'}`}>
              {chlorophyllVal} {isWater && <span className="text-[10px] text-gray-500">mg/m³</span>}
            </div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Turbidity (K490)</div>
            <div className={`text-base font-semibold ${isWater ? 'text-cyan-400' : 'text-gray-400'}`}>
              {turbidityVal} {isWater && <span className="text-[10px] text-gray-500">m⁻¹</span>}
            </div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Air/Surface Temp</div>
            <div className="text-base font-semibold text-amber-400">{tempVal} <span className="text-[10px] text-gray-500">°C</span></div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Wind Speed</div>
            <div className="text-base font-semibold text-blue-400">{windVal} <span className="text-[10px] text-gray-500">m/s</span></div>
          </div>

          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
            <div className="text-[11px] text-gray-400">Precipitation</div>
            <div className="text-base font-semibold text-purple-400">{precipVal} <span className="text-[10px] text-gray-500">mm</span></div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/40">
        <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">AI Agent Ecological Synthesis</div>
        <p className="text-xs text-gray-300 leading-relaxed">{summaryText}</p>
      </div>

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
