const iconsList = document.getElementById('icons-list')
const iconsCount = document.getElementById('icons_count')
const searchInput = document.getElementById('text')
const iconsStatus = document.getElementById('icons-status')
const emptyImage = document.getElementById('icons-empty')
const batchSize = 50
const preview = document.getElementById('icon-preview')
const previewArt = preview.querySelector('.preview-art')
const previewName = preview.querySelector('span')
const mobilePreview = matchMedia('(max-width: 720px), (pointer: coarse)')
let previewItem
let previewRequest = 0
mobilePreview.addEventListener('change', hidePreview)

function hidePreview() {
  if (!previewItem) return
  previewRequest++
  preview.hidden = true
  previewItem = null
}

async function loadPreview(src, request) {
  previewArt.replaceChildren()
  preview.setAttribute('aria-busy', 'true')
  const image = new Image(192, 192)
  image.alt = ''
  image.src = src
  try {
    await image.decode()
    if (request === previewRequest) previewArt.replaceChildren(image)
  } catch {
    // Keep the icon name visible if the PNG is unavailable.
  } finally {
    if (request === previewRequest) preview.setAttribute('aria-busy', 'false')
  }
}

function showPreview(item, x, y) {
  if (mobilePreview.matches) return
  if (item !== previewItem) {
    const image = item.querySelector('img')
    previewName.textContent = image.alt
    previewItem = item
    preview.hidden = false
    loadPreview(image.src, ++previewRequest)
  }
  const gap = 14
  const left = x + gap + preview.offsetWidth <= document.documentElement.clientWidth
    ? x + gap : x - gap - preview.offsetWidth
  const top = y + gap + preview.offsetHeight <= window.innerHeight
    ? y + gap : y - gap - preview.offsetHeight
  preview.style.left = Math.max(4, left) + 'px'
  preview.style.top = Math.max(4, top) + 'px'
}

iconsList.addEventListener('pointermove', event => {
  const item = event.target.closest('.icon-item')
  if (item && event.pointerType !== 'touch') showPreview(item, event.clientX, event.clientY)
  else hidePreview()
})
iconsList.addEventListener('focusin', event => {
  const item = event.target.closest('.icon-item:focus-visible')
  if (!item) return
  const bounds = item.getBoundingClientRect()
  showPreview(item, bounds.right, bounds.top)
})
iconsList.addEventListener('pointerleave', hidePreview)
iconsList.addEventListener('focusout', hidePreview)
document.addEventListener('scroll', hidePreview, true)
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') hidePreview()
})

function updateScrollFades() {
  const maxScroll = iconsList.scrollHeight - iconsList.clientHeight
  const top = Math.max(0, Math.min(iconsList.scrollTop, maxScroll))
  iconsList.style.setProperty('--fade-top', top + 'px')
  iconsList.style.setProperty('--fade-bottom', Math.max(0, maxScroll - top - 1) + 'px')
}

iconsList.addEventListener('scroll', updateScrollFades, { passive: true })
new ResizeObserver(updateScrollFades).observe(iconsList)

const brandTitle = document.querySelector('.intro-brand h1')
const brandPalette = Array.from(document.querySelectorAll('.intro-shapes i'),
  shape => shape.style.getPropertyValue('--color').trim())

brandTitle.addEventListener('pointerenter', event => {
  if (event.pointerType === 'touch') return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  for (const letter of brandTitle.querySelectorAll('tspan')) {
    const colors = [...brandPalette]
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[colors[i], colors[j]] = [colors[j], colors[i]]
    }
    const start = getComputedStyle(letter).fill
    for (const animation of letter.getAnimations()) animation.cancel()
    letter.animate({ fill: [start, ...colors] }, {
      duration: 3300, iterations: Infinity, direction: 'alternate'
    })
  }
})

brandTitle.addEventListener('pointerleave', () => {
  for (const letter of brandTitle.querySelectorAll('tspan')) {
    const animations = letter.getAnimations()
    if (!animations.length) continue
    const fill = getComputedStyle(letter).fill
    for (const animation of animations) animation.cancel()
    letter.animate({ fill: [fill, 'currentColor'] }, { duration: 420, easing: 'ease-out' })
  }
})

document.addEventListener('dragstart', event => {
  if (!event.target.matches('.icon-item img')) event.preventDefault()
})

async function showIconCount(count) {
  const number = String(count)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    iconsCount.textContent = number
    return
  }

  const animations = []
  const digits = document.createDocumentFragment()
  iconsCount.setAttribute('aria-label', number)
  for (const digit of number.padStart(5, '0')) {
    const slot = document.createElement('span')
    slot.className = 'count-digit'
    slot.setAttribute('aria-hidden', 'true')
    const strip = document.createElement('span')
    const steps = 9 - Number(digit)
    strip.textContent = '0123456789'.slice(Number(digit)).split('').join('\n')
    slot.append(strip)
    digits.append(slot)
    animations.push(strip.animate([
      { transform: `translateY(-${steps}lh)` },
      { transform: 'translateY(0)' }
    ], { duration: steps * 210, easing: 'cubic-bezier(0.35, 0, 0.25, 1)' }).finished)
  }
  iconsCount.replaceChildren(digits)
  await Promise.all(animations)
  const slots = Array.from(iconsCount.children)
  const leadingZeros = slots.length - number.length
  slots.forEach((slot, index) => {
    if (index < leadingZeros) {
      slot.remove()
      return
    }
    slot.firstElementChild.textContent = number[index - leadingZeros]
    slot.removeAttribute('aria-hidden')
  })
  iconsCount.removeAttribute('aria-label')
}

function sampleIcons(icons, count) {
  const indices = new Set()
  const size = Math.min(icons.length, count)
  while (indices.size < size) {
    indices.add(Math.floor(Math.random() * icons.length))
  }
  return Array.from(indices, index => icons[index])
}

async function initIcons() {
  const response = await fetch(ICON_CATALOG_URL)
  if (!response.ok) throw new Error('Failed to load the icon list')
  const icons = await response.json()
  const firstScreenCount = 24
  const featured = sampleIcons(icons, firstScreenCount + 15)
  const firstScreen = featured.slice(0, firstScreenCount)
  const selected = new Set(firstScreen)
  const browseIcons = firstScreen.concat(icons.filter(file => !selected.has(file)))
  const background = document.querySelector('.intro-floating-icons')
  for (const file of featured.slice(firstScreenCount)) {
    const slot = document.createElement('div')
    slot.className = 'floating-icon'
    const image = new Image()
    image.alt = ''
    image.src = './assets/icons/' + encodeURIComponent(file)
    slot.append(image)
    background.append(slot)
    image.decode().then(() => image.classList.add('loaded')).catch(() => image.remove())
  }
  showIconCount(icons.length)

  let matches = browseIcons
  let previousQuery
  let rendered = 0
  let revealStart
  let filterTimer
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
    const target = iconsList.lastElementChild
    if (entries.some(entry => entry.isIntersecting && entry.target === target)) {
      renderBatch()
    }
  }, { root: iconsList, rootMargin: '150px 0px' })

  function renderBatch() {
    const batch = document.createDocumentFragment()
    const end = Math.min(rendered + batchSize, matches.length)
    for (; rendered < end; rendered++) {
      const file = matches[rendered]
      const stem = file.slice(0, -4)
      const name = stem.split('_').filter(Boolean)
        .map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
      const item = document.createElement('a')
      item.className = 'icon-item'
      item.target = '_blank'
      item.rel = 'noopener'
      item.href = 'https://raw.githubusercontent.com/Delta-Icons/android/refs/heads/master/resources/vectors/' + encodeURIComponent(stem) + '.svg'
      const image = document.createElement('img')
      image.loading = 'lazy'
      image.decoding = 'async'
      image.src = './assets/icons/' + encodeURIComponent(file)
      image.alt = name
      item.append(image)
      batch.append(item)
    }
    const added = revealStart !== undefined ? Array.from(batch.children) : []
    iconsList.append(batch)
    if (added.length) {
      const bounds = iconsList.getBoundingClientRect()
      const top = Math.max(0, bounds.top)
      const bottom = Math.min(window.innerHeight, bounds.bottom)
      const visible = added.filter(item => {
        const rect = item.getBoundingClientRect()
        return rect.top < bottom && rect.bottom > top
      })
      const first = rendered - added.length
      if (first === 0) revealStart = performance.now()
      const elapsed = performance.now() - revealStart
      visible.forEach((item, index) => {
        item.animate([
          { opacity: 0, transform: 'translateX(12px)' },
          { opacity: 1, transform: 'translateX(0)' }
        ], {
          duration: 160,
          delay: (first + index) * 10 - elapsed,
          easing: 'ease-out',
          fill: 'backwards'
        })
      })
      if (visible.length < added.length) revealStart = undefined
    }
    observer.disconnect()
    if (rendered < matches.length) observer.observe(iconsList.lastElementChild)
    updateScrollFades()
  }

  function filterIcons() {
    const query = searchInput.value.trim().toLowerCase().replace(/\s+/g, '_')
    if (query === previousQuery) return
    revealStart = previousQuery !== undefined && !matchMedia('(prefers-reduced-motion: reduce)').matches
      ? performance.now() : undefined
    const candidates = previousQuery && query.includes(previousQuery) ? matches : icons
    matches = query ? candidates.filter(file => file.slice(0, -4).toLowerCase().includes(query)) : browseIcons
    previousQuery = query
    rendered = 0
    hidePreview()
    iconsList.replaceChildren()
    iconsList.scrollTop = 0
    emptyImage.setAttribute('aria-hidden', !(query && matches.length === 0))
    renderBatch()
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(filterTimer)
    filterTimer = setTimeout(filterIcons, 500)
  })
  searchInput.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.isComposing) return
    event.preventDefault()
    clearTimeout(filterTimer)
    searchInput.value = ''
    filterIcons()
  })
  filterIcons()
}

initIcons().catch(() => {
  iconsStatus.textContent = 'Could not load the icon list. Please reload the page.'
  iconsStatus.hidden = false
})

const linuxButton = document.getElementById('linux')
const copyStatus = document.getElementById('copy-status')
let copyStatusTimer
let hoveringLinux = false
linuxButton.addEventListener('pointerenter', event => {
  hoveringLinux = event.pointerType !== 'touch'
})
linuxButton.addEventListener('pointerleave', () => {
  hoveringLinux = false
  if (!copyStatusTimer) copyStatus.textContent = ''
})
linuxButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(linuxButton.dataset.command)
    copyStatus.textContent = 'The command was copied!'
  } catch {
    copyStatus.textContent = 'Could not copy the command.'
  }
  clearTimeout(copyStatusTimer)
  copyStatusTimer = setTimeout(() => {
    copyStatusTimer = undefined
    if (!hoveringLinux) copyStatus.textContent = ''
  }, 5000)
})
