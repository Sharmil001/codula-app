import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import "@/styles/globals.css";
import { BottomNavigationBar } from '@/components/navigation/bottom-navigation-bar'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Codula - GitHub Profile & PR Analyzer',
  description: 'Track your GitHub contributions and analyze pull requests with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen pb-20">
          {children}
        </main>
        <BottomNavigationBar />
        <Toaster position="top-center" />
      </body>
    </html>
  )
}