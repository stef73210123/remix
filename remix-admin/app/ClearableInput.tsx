'use client'

import { X } from 'lucide-react'
import type { CSSProperties, InputHTMLAttributes } from 'react'

/**
 * A plain-text `<input>` with a clear (×) button that appears once it has a
 * value. `type="search"` inputs already get this for free from the browser
 * in Chromium/Safari; every plain `type="text"` (or untyped, default-text)
 * field doesn't, so this fills that gap wherever the app has one — clearing
 * a filter/search/amount box then never requires a manual select-all + delete.
 * `wrapperStyle` takes the layout-affecting props (flex, width, maxWidth)
 * that used to live directly on the `<input>`; the rest of `style` stays on
 * the input itself for its visual appearance.
 */
export default function ClearableInput({
  value, onChange, wrapperStyle, style, ...inputProps
}: {
  value: string
  onChange: (value: string) => void
  wrapperStyle?: CSSProperties
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', minWidth: 0, ...wrapperStyle }}>
      <input
        {...inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // paddingRight is reserved unconditionally (not just while the clear
        // button shows) — toggling it in and out of the style object between
        // renders mixes shorthand `padding` (from `style`) with longhand
        // `paddingRight` in a way React warns about, and it'd shift the
        // input's content sideways every time the button appears/disappears.
        style={{ width: '100%', boxSizing: 'border-box', ...style, paddingRight: 24 }}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onChange('')}
          style={{
            all: 'unset', position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            cursor: 'pointer', display: 'flex', color: 'var(--muted)', padding: 2, lineHeight: 0,
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
