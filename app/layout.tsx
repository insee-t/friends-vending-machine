import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'เครื่องขายเพื่อน - Friend Vending Machine',
  description: 'โครงการเพื่อส่งเสริมความสัมพันธ์ในคณะวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น',
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

