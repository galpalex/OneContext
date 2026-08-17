import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { SideNav } from './SideNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="oc-shell">
      <a className="oc-skip-link" href="#oc-main">
        Skip to main content
      </a>

      <div className="oc-shell__topbar">
        <TopBar />
      </div>

      <div className="oc-shell__nav">
        <SideNav />
      </div>

      <main className="oc-shell__main" id="oc-main">
        {children}
      </main>
    </div>
  )
}
