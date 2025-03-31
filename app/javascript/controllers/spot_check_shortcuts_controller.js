import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "liveUrl", "codeUrl", "notes"]
  static values = {
    platformMac: { type: Boolean, default: navigator.platform.toUpperCase().indexOf('MAC') >= 0 }
  }

  connect() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    document.addEventListener('keydown', this.boundHandleKeyDown)
    this.updateShortcutIndicators()
  }

  disconnect() {
    document.removeEventListener('keydown', this.boundHandleKeyDown)
  }

  updateShortcutIndicators() {
    document.querySelectorAll('.js-shortcut-key').forEach(el => {
      el.textContent = this.platformMacValue ? el.dataset.mac : el.dataset.win
    })
  }

  handleKeyDown(e) {
    // Prevent handling if focus is in a text field (except for cmd/ctrl combinations)
    const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
    const isModifierKey = e.metaKey || e.ctrlKey
    
    if (isInputFocused && !isModifierKey) {
      return
    }

    // Handle modifier key combinations first (these take precedence)
    if (isModifierKey) {
      if (e.key === 'Enter' || e.key === 'Return') {
        // Submit the form
        if (this.hasFormTarget) {
          this.formTarget.requestSubmit()
          e.preventDefault()
        }
        return
      }
    }

    // Only process these shortcuts if not in a text field
    if (!isInputFocused) {
      // URL shortcuts
      if (e.key === 'd') {
        if (this.hasLiveUrlTarget && this.liveUrlTarget.dataset.url) {
          window.open(this.liveUrlTarget.dataset.url, '_blank')
          e.preventDefault()
        }
        return
      } else if (e.key === 'f') {
        if (this.hasCodeUrlTarget && this.codeUrlTarget.dataset.url) {
          window.open(this.codeUrlTarget.dataset.url, '_blank')
          e.preventDefault()
        }
        return
      }
      
      // Assessment shortcuts
      if (e.key === 'j' || e.key === 'k' || e.key === 'l') {
        const color = e.key === 'j' ? 'green' : e.key === 'k' ? 'yellow' : 'red'
        const radio = document.querySelector(`#spot_check_assessment_${color}`)
        if (radio) {
          radio.click()
          e.preventDefault()
        }
      } else if (e.key === 'n') {
        // Focus the notes field
        if (this.hasNotesTarget) {
          this.notesTarget.focus()
          e.preventDefault()
        }
      }
    }
  }
} 