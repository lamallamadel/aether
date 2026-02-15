import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

type Option<T extends string> = { value: T; label: string }

export function ThemedSelect<T extends string>(props: {
  value: T
  options: Array<Option<T>>
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  const { value, options, onChange, ariaLabel, className } = props
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()

  const selected = useMemo(() => options.find((o) => o.value === value) ?? options[0], [options, value])
  const selectedIndex = useMemo(() => Math.max(0, options.findIndex((o) => o.value === value)), [options, value])

  useEffect(() => {
    if (!open) return
    const onAnyPointerDown = (event: MouseEvent | PointerEvent) => {
      const el = rootRef.current
      if (!el) return
      if (!el.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onAnyPointerDown)
    document.addEventListener('mousedown', onAnyPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onAnyPointerDown)
      document.removeEventListener('mousedown', onAnyPointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      optionRefs.current[selectedIndex]?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open, selectedIndex])

  const closeAndFocusButton = () => {
    setOpen(false)
    window.setTimeout(() => buttonRef.current?.focus(), 0)
  }

  const onButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen((v) => !v)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeAndFocusButton()
    }
  }

  const onOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeAndFocusButton()
      return
    }
    if (e.key === 'Tab') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      optionRefs.current[(idx + 1) % options.length]?.focus()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      optionRefs.current[(idx - 1 + options.length) % options.length]?.focus()
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      optionRefs.current[0]?.focus()
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      optionRefs.current[options.length - 1]?.focus()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const opt = options[idx]
      onChange(opt.value)
      closeAndFocusButton()
    }
  }

  optionRefs.current = []

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        className={`search-select bg-[#1a1a1a] text-gray-200 text-sm rounded-md px-3 py-2 border border-white/5 flex items-center justify-between gap-2 ${className ?? ''}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronDown size={14} className={`shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 mt-1 w-full z-50 bg-[#111111] border border-white/10 rounded-lg shadow-2xl p-1 max-h-64 overflow-y-auto custom-scrollbar"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                ref={(el) => {
                  optionRefs.current[idx] = el
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`w-full text-left px-3 py-2 text-xs rounded-md menu-focus ${
                  isSelected ? 'bg-purple-600/20 text-white' : 'text-gray-200 hover:bg-white/5'
                }`}
                onKeyDown={(e) => onOptionKeyDown(e, idx)}
                onClick={() => {
                  onChange(opt.value)
                  closeAndFocusButton()
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

