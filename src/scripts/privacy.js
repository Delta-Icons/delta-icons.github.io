const policyDialog = document.getElementById('privacy')
const policyLink = document.querySelector('a[href="#privacy"]')

async function syncPolicyDialog() {
  if (location.hash === '#privacy') {
    policyDialog.classList.remove('closing')
    if (!policyDialog.open) policyDialog.showModal()
    return
  }
  if (!policyDialog.open) return
  policyDialog.classList.add('closing')
  await Promise.allSettled(policyDialog.getAnimations().map(animation => animation.finished))
  if (location.hash !== '#privacy') policyDialog.close()
}

function dismissPolicy() {
  if (history.state?.openedPrivacy) {
    history.back()
  } else {
    history.replaceState(history.state, '', location.pathname + location.search)
    syncPolicyDialog()
  }
}

policyLink.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (location.hash !== '#privacy') history.pushState({ openedPrivacy: true }, '', '#privacy')
  syncPolicyDialog()
})
policyDialog.addEventListener('copy', event => event.preventDefault())
policyDialog.querySelector('button').addEventListener('click', dismissPolicy)
policyDialog.addEventListener('cancel', event => {
  event.preventDefault()
  dismissPolicy()
})
policyDialog.addEventListener('click', event => {
  if (event.target !== policyDialog) return
  const box = policyDialog.getBoundingClientRect()
  if (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom) dismissPolicy()
})
window.addEventListener('hashchange', syncPolicyDialog)
syncPolicyDialog()
