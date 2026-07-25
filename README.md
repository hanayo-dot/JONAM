JONAM - Lake Victoria Pollution & Ecological Risk Assessment Model

An interactive, machine-learning-driven environmental monitoring and risk assessment platform built to protect **Lake Victoria's** ecosystem. **JONAM** evaluates live water telemetry, satellite climatology, and weather forecasts to predict water hyacinth weed mat expansion and safeguard native fish stocks (Tilapia & Nile Perch).

---

## 🌊 Overview & Core Mission

Lake Victoria faces severe ecological pressures caused by agricultural runoff, industrial effluent, and warming surface temperatures. **JONAM** provides decision-makers, harbor managers, and fisheries officers with predictive risk assessments focusing on two interconnected challenges:

1. **🌿 Hyacinth Proliferation Control**: Monitors satellite Chlorophyll-a concentrations ($>40\text{ mg/m}^3$) and wind vectors to forecast floating weed mat accumulation before it clogs transportation corridors, water intakes, and harbors.
2. **🐟 Fish Stock Protection (Tilapia & Nile Perch)**: Tracks underwater light extinction (Turbidity $K_{490} > 1.5\text{ m}^{-1}$) and decaying weed biomass hypoxia to safeguard littoral fish breeding bays and spawning grounds.

---

## ✨ Key Features

* 🗺️ **Interactive Spatial ML Map**: Leaflet-powered spatial interface centered over Lake Victoria. Click any aquatic coordinate (e.g. Kisumu Bay, Homa Bay, Entebbe) or inland point to run instant machine learning risk inference.
* 📊 **Dual Risk Gauges**:
  * **Hyacinth Biomass Proliferation Index (%)**: Derived from Chlorophyll-a density, surface temperature, and nutrient transport.
  * **Fish Stock Vulnerability Index (%)**: Derived from turbidity light attenuation and oxygen depletion risk.
* 🛰️ **Live Water Telemetry Inputs**:
  * **Chlorophyll-a** ($\text{mg/m}^3$)
  * **Turbidity / $K_{490}$** ($\text{m}^{-1}$)
  * **Surface Water Temperature** ($\text{°C}$)
  * **Wind Speed** ($\text{m/s}$)
  * **Precipitation** ($\text{mm}$)
* 🤖 **AI Limnological Reasoning Engine**: Powered by Google Gemini 1.5 Flash to synthesize complex multi-parameter telemetry into actionable management decisions (e.g. containment boom deployment, mechanical harvesting schedules, eco-protection nursery zones).
* 💬 **ML Decision Assistant**: Interactive chat interface enabling stakeholders to query the AI reasoning engine directly for context-aware ecological advice.
* ⚡ **Dual-Engine Resilience**: Seamlessly operates with a live Python Flask backend or falls back to a standalone client spatial inference engine on static production hosts (e.g. Firebase Hosting).

---

