const iconSection = document.getElementById('icons');
const iconsList = document.getElementById('icons-list');
/**
 * Maximum number of icons per page
 */
const MAX = 25;

/**
 * Formats a icon file name into a space-separated name
 * @param {string} icon Icon file name
 *
 * @example
 * formatIconName('ac_display.png'); // → Ac Display
 */
const formatIconName = icon =>
  icon
    .slice(0, icon.indexOf('.'))
    .split('_')
    .map(str => str.charAt(0).toUpperCase() + str.slice(1))
    .join(' ');

/**
 * Constructs HTML component for a single icon item
 * @param {string} icon Icon file name
 */
const IconItem = icon => {
  const iconItem = document.createElement('div');
  iconItem.className = 'icon-item';
  var url

  if (window.location.hostname == 'delta-icons.github.io') url = `https://github.com/Delta-Icons/android/raw/master/app/src/main/res/drawable-nodpi/${icon}`
  else url = `./assets/img/icons/${icon}`

  iconItem.innerHTML = /* html */ `
    <img src="${url}" />
    <p>${formatIconName(icon)}</p>
  `;
  return iconItem;
};

/**
 * Renders a "page" of 100 icons. Returns the next page number.
 * Images are rendered 100 at a time so as to avoid overloading the DOM.
 * @param {string[]} icons List of icon file names
 * @param {number} pagination Current page of infinite scroll
 * @returns {number} the next page
 */
const renderIcons = (icons, pagination = 0) => {
  icons.slice(pagination * MAX, (pagination + 1) * MAX).forEach(icon => {
    iconsList.append(IconItem(icon));
  });

  return pagination + 1;
};

/**
 * Fetches icon file names from `/icons` folder.
 * This function grabs an HTML page for the list of files in that folder
 * and then uses a regex to pull out the file names from the anchor tags.
 * @returns {string[]} list of icon file names
 */

const getIcons = async () => {
  var matches = []
  var iconsHtml
  if (window.location.hostname == 'delta-icons.github.io') {
    const response = await fetch('https://api.github.com/repos/Delta-Icons/android/git/trees/master?recursive=1');
    const data = await response.json();
    for (var url of data.tree) {
      var basename = url.path.split('/').slice(-1)[0]
      if (url.path.startsWith('app/src/main/res/drawable-nodpi/'))
      matches.push(['', basename])
    }
  } else {
    iconsHtml = await fetch('./assets/img/icons/').then(res => res.text());
    matches = iconsHtml.matchAll(/<li><a href="(.+?)"/g);
  }
  const icons = [];
  for (const match of matches) {
    if (!/^ic_|^clock_|^preview/.test(match))
      icons.push(match[1]);
  }
  return icons;
};



/**
 * Intializes code for rendering icon images:
 * fetches the icons, renders the first page, and adds an event listener to the `window` for infinite scrolling.
 */
const initIcons = async () => {
  const icons = await getIcons();
  let pagination = renderIcons(icons);

  // infinite scroll
  window.addEventListener('scroll', () => {
    if (
      window.scrollY + window.innerHeight >
      iconSection.offsetTop + iconSection.offsetHeight
    ) {
      pagination = setTimeout(renderIcons(icons, pagination), 2000)
    }
  });
};

initIcons();
