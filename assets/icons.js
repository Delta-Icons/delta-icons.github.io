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

  iconItem.innerHTML = /* html */ `
    <img src="/assets/img/icons/${icon}" />
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
  const iconsHtml = await fetch('./assets/img/icons/').then(res => res.text());
  const matches = iconsHtml.matchAll(/<li><a href="(.+?)"/g);
  const icons = [];
  for (const match of matches) {
    icons.push(match[1]);
  }
  console.log(icons)
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
      pagination = renderIcons(icons, pagination);
    }
  });
};

initIcons();
