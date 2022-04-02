/**
 * Scroll element into center if not visible
 *
 * @param {Element} element DOM element to scroll
 */
export default function scrollToElement(element) {
	if (!(element instanceof Element)) {
		console.error('Error: Not a DOM element', element)
		return
	}

	const elementRect = element.getBoundingClientRect()
	if (elementRect.bottom > window.innerHeight || elementRect.top < 0) {
		element.scrollIntoView({
			behavior: 'auto',
			block: 'center',
			inline: 'nearest',
		})
	}
}
