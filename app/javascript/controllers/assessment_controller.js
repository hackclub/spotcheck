import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["radio", "option"]
  
  connect() {
    // Initialize highlighting when controller connects
    const checked = this.radioTargets.find(radio => radio.checked)
    if (checked) {
      this.highlightSelected(checked)
    }
  }
  
  select(event) {
    this.highlightSelected(event.target)
  }
  
  highlightSelected(selectedRadio) {
    // Reset all options
    this.optionTargets.forEach(option => {
      option.className = option.className.replace(/bg-\w+-\d+ border-\w+-\d+/g, '')
      option.className = "flex items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50 border-gray-300"
    })
    
    // Apply background to selected option
    if (selectedRadio && selectedRadio.checked) {
      const value = selectedRadio.dataset.value
      const option = this.optionTargets.find(opt => opt.dataset.value === value)
      if (option) {
        const bgClass = option.dataset.bgClass
        if (bgClass) {
          option.classList.add(...bgClass.split(' '))
        }
      }
    }
  }
} 