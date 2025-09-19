import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Friends Vending Machine',
  description: 'โครงการเพื่อส่งเสริมความสัมพันธ์ในคณะวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

