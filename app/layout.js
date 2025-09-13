import './globals.css'

export const metadata = {
  title: '명찰 제작 시스템',
  description: 'Supabase와 Next.js를 활용한 웹 기반 명찰 제작 시스템',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
