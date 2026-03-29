import type { Component } from 'vue'
import { createApp } from 'vue'

export function mount(component: Component): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(component)
  app.mount(host)
  return host
}
