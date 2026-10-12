'use client'

import { useState } from 'react'
import { Sparkles, X, Send } from 'lucide-react'

// UI-only preview of a future feature — no backend, no API calls. Input and
// send button are intentionally disabled (not just hidden) so it reads as
// "coming soon" rather than "broken". See
// docs/changes/20260808_AI助理面板ComingSoon.md
export function AiAssistantPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 flex items-stretch transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : 'translate-x-[calc(100%-2.75rem)]'
      }`}
    >
      {/* Region 1 of 3: always-visible launcher tab, full height so it reads as part of the panel, not a floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Collapse AI Assistant panel' : 'Expand AI Assistant panel'}
        className="flex w-11 shrink-0 flex-col items-center justify-center gap-2 border-y border-l border-border-subtle bg-surface py-4 text-ink-faint shadow-card hover:text-primary transition-colors"
      >
        <Sparkles size={16} className="shrink-0" />
        <span className="text-label-md font-mono tracking-wide [writing-mode:vertical-rl]">AI Assistant</span>
      </button>

      <div className="flex h-full w-96 flex-col border-y border-l border-border-subtle bg-surface shadow-modal">
        {/* Region 2 of 3: fixed header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary shrink-0" />
            <span className="text-body-md font-semibold text-on-surface">AI Assistant</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary font-mono">
              Coming Soon
            </span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close AI Assistant panel" className="text-ink-faint hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Region 3 of 3: scrollable message area — empty/placeholder for now, but fills all remaining height */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-8 text-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles size={20} className="text-primary" />
          </div>
          <p className="text-body-md text-ink-faint max-w-[22rem]">
            Ask questions about your cases, risk scores, and compliance status — right from wherever you're working. This assistant is on the roadmap and isn't wired up yet.
          </p>
        </div>

        {/* Fixed input footer, pinned to the bottom regardless of content above */}
        <div className="flex shrink-0 items-center gap-2 border-t border-border-subtle p-3">
          <input
            type="text"
            disabled
            placeholder="Ask a question…"
            aria-disabled="true"
            className="h-10 flex-1 rounded-lg border border-border-subtle bg-surface-container-low px-3 text-body-md text-ink-faint placeholder:text-ink-faint cursor-not-allowed"
          />
          <button disabled aria-disabled="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/40 text-white cursor-not-allowed">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
