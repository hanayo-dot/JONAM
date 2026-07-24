import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JONAM | Lake Victoria Ecological AI Platform',
  description: 'AI-Powered Water Hyacinth Proliferation & Agro-Climate Risk Forecasting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
