'use client'

import React from 'react'

export interface RiskReportData {
  id: string
  location: string
  latitude: number
  longitude: number
  risk_score?: number
  hyacinth_risk_score?: number
  fish_vulnerability_score?: number
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
  synergistic_summary?: string
  agent_summary?: string
  gemini_summary?: string
  hyacinth_control_actions?: string[]
  fish_stock_actions?: string[]
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
      <div className="presentation-card text-center py-10">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-400">Evaluating AI Agents Assessment & Inference...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="presentation-card text-center py-10">
        <h3 className="text-lg font-extrabold text-white mb-2">Interactive Machine Learning Risk Inference</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Click any point on Lake Victoria to evaluate risks for Hyacinth Control and Fish Stock Protection.
        </p>
        <button onClick={onGenerate} className="btn-action">
          Run Risk Assessment Model
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

  const hRisk = isWater ? (report.hyacinth_risk_score || report.risk_score || 70) : 0
  const fRisk = isWater ? (report.fish_vulnerability_score || 75) : 0
  const summaryText = report.synergistic_summary || report.agent_summary || report.gemini_summary || ''

  return (
    <div className="presentation-card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mb-0.5">ECOLOGICAL ML ASSESSMENT REPORT</div>
          <h2 className="text-xl font-extrabold text-white">{report.location}</h2>
          <div className="text-xs text-slate-400 mt-0.5">
            Coordinates: {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}° • Time: {new Date(report.timestamp).toLocaleTimeString()}
          </div>
        </div>

        <div className={`badge ${badgeStyle}`}>
          <span>●</span> {report.status_level}
        </div>
      </div>

      {/* Dual Gauges */}
      <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
        <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/40">
          <div className="text-[11px] font-bold text-cyan-400 uppercase">🌿 Hyacinth Proliferation Risk</div>
          <div className={`text-2xl font-extrabold mt-1 ${hRisk > 70 ? 'text-red-400' : hRisk > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {hRisk}%
          </div>
          <div className="text-[10px] text-slate-400">Biomass Mat Proliferation Index</div>
        </div>

        <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/40">
          <div className="text-[11px] font-bold text-purple-400 uppercase">🐟 Fish Stock Vulnerability</div>
          <div className={`text-2xl font-extrabold mt-1 ${fRisk > 70 ? 'text-red-400' : fRisk > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {fRisk}%
          </div>
          <div className="text-[10px] text-slate-400">Habitat & Hypoxia Impact Index</div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Live Water Telemetry Inputs</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Chlorophyll-a</div>
            <div className={`text-base font-bold ${isWater ? 'text-emerald-400' : 'text-slate-400'}`}>
              {chlorophyllVal} {isWater && <span className="text-[10px] text-slate-500">mg/m³</span>}
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Turbidity (K490)</div>
            <div className={`text-base font-bold ${isWater ? 'text-cyan-400' : 'text-slate-400'}`}>
              {turbidityVal} {isWater && <span className="text-[10px] text-slate-500">m⁻¹</span>}
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Surface Temp</div>
            <div className="text-base font-bold text-amber-400">{tempVal} <span className="text-[10px] text-slate-500">°C</span></div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Wind Speed</div>
            <div className="text-base font-bold text-blue-400">{windVal} <span className="text-[10px] text-slate-500">m/s</span></div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Precipitation</div>
            <div className="text-base font-bold text-purple-400">{precipVal} <span className="text-[10px] text-slate-500">mm</span></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5">AI AGENTS ASSESSMENT</div>
        <p className="text-xs text-slate-300 leading-relaxed">{summaryText}</p>
      </div>

      {/* Decision Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/40 space-y-2">
          <div className="text-xs font-bold text-cyan-300 uppercase">🌿 Hyacinth Control Decisions</div>
          <ul className="space-y-1.5">
            {(report.hyacinth_control_actions || report.actionable_items || []).slice(0, 2).map((item, idx) => (
              <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/40 space-y-2">
          <div className="text-xs font-bold text-purple-300 uppercase">🐟 Fish Stock Protection Decisions</div>
          <ul className="space-y-1.5">
            {(report.fish_stock_actions || report.actionable_items || []).slice(0, 2).map((item, idx) => (
              <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
