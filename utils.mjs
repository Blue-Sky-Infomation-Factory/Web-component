import { get, ParseType } from "/javascript/module/fetch.mjs";

/**
 * 加载 css 至 head
 * @param {import("/javascript/module/fetch.mjs").URLInit} url
 */
async function loadCss(url) {
	const element = document.createElement("style");
	element.textContent = await get(url, null, ParseType.TEXT).result;
	document.head.appendChild(element);
}

export { loadCss };