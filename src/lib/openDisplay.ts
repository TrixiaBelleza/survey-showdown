export function displayUrl(): string {
  return `${window.location.origin}${window.location.pathname}#/display`
}

export function hostUrl(): string {
  return `${window.location.origin}${window.location.pathname}#/host`
}

/**
 * Opens the audience view in a separate window so the host can drag it to the
 * second monitor and share that window in Teams.
 */
export function openDisplayWindow() {
  window.open(displayUrl(), 'survey-showdown-display', 'popup=yes,width=1280,height=720')
}

export function openHostWindow() {
  window.open(hostUrl(), 'survey-showdown-host', 'width=1600,height=900')
}
