const iconsList = document.getElementById('icons-list')
const iconsCount = document.getElementById('icons_count')
const searchInput = document.getElementById('text')
const iconsStatus = document.getElementById('icons-status')
const batchSize = 50

async function initIcons() {
  const response = await fetch('./assets/img/icons/icons.json')
  if (!response.ok) throw new Error('Failed to load the icon list')
  const icons = await response.json()
  iconsCount.textContent = icons.length

  let matches = icons
  let previousQuery
  let rendered = 0
  iconsList.addEventListener('load', async event => {
    const image = event.target
    if (!(image instanceof HTMLImageElement)) return
    try {
      await image.decode()
      image.parentElement?.classList.add('loaded')
    } catch {
      // Keep the placeholder if the PNG cannot be decoded.
    }
  }, true)

  const observer = new IntersectionObserver(entries => {
    const target = iconsList.lastElementChild || iconsList
    if (entries.some(entry => entry.isIntersecting && entry.target === target)) {
      renderBatch()
    }
  }, { rootMargin: '300px' })

  function renderBatch() {
    observer.disconnect()
    const batch = document.createDocumentFragment()
    const end = Math.min(rendered + batchSize, matches.length)
    for (; rendered < end; rendered++) {
      const file = matches[rendered]
      const name = file.slice(0, -4).split('_').filter(Boolean)
        .map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
      const item = document.createElement('div')
      item.className = 'icon-item'
      const image = document.createElement('img')
      image.loading = 'lazy'
      image.decoding = 'async'
      image.src = './assets/img/icons/' + encodeURIComponent(file)
      image.alt = name
      const label = document.createElement('p')
      label.textContent = name
      item.append(image, label)
      batch.append(item)
    }
    iconsList.append(batch)
    if (rendered < matches.length) observer.observe(iconsList.lastElementChild)
  }

  function filterIcons() {
    const query = searchInput.value.trim().toLowerCase().replace(/\s+/g, '_')
    if (query === previousQuery) return
    const candidates = previousQuery && query.includes(previousQuery) ? matches : icons
    matches = query ? candidates.filter(file => file.slice(0, -4).toLowerCase().includes(query)) : icons
    previousQuery = query
    rendered = 0
    observer.disconnect()
    iconsList.replaceChildren()
    iconsStatus.hidden = matches.length > 0
    iconsStatus.textContent = matches.length ? '' : 'No icons found.'
    if (matches.length) observer.observe(iconsList)
  }

  searchInput.addEventListener('input', filterIcons)
  filterIcons()
}

initIcons().catch(() => {
  iconsStatus.textContent = 'Could not load the icon list. Please reload the page.'
  iconsStatus.hidden = false
})

// Copy value to buffer

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function copyToBuffer(caller, element) {
  element = document.getElementById(element)
  var previousText = element.innerText
  var onclickAttr = caller.getAttribute('onclick')
  var textToCopy = element.getAttribute('copy')
  caller.setAttribute('onclick', 'false')
  navigator.clipboard.writeText(textToCopy)
  element.innerText = 'The command was copied!'
  delay(3000).then(() => {
    element.innerText = previousText
    caller.setAttribute('onclick', onclickAttr)
  })
}
