import { EVENT_LISTENERS, parseAndGetNodes } from "../../javascript/module/array_HTML.mjs";
import { VerticalSyncThrottle } from "../../javascript/module/Throttle.mjs";
import { loadCss } from "../utils.mjs";

await loadCss(import.meta.resolve("./style.css"));

const round = Math.round;

function buildItem(data) {
	const temp = [];
	if ("image" in data) temp.push(["div", null, { class: "bs-carousel-item-image", style: `background-image:url("${data.image}")` }]);
	if ("text" in data) temp.push(["div", data.text, { class: "bs-carousel-item-text", title: data.text }]);
	const item = ["div", temp, { class: "bs-carousel-item" }, "item", true], action = data.action, attribute = item[2];
	switch (typeof action) {
		case "function":
			attribute.class += " action";
			attribute[EVENT_LISTENERS] = [["click", action]];
			break;
		case "string":
			item[0] = "a";
			attribute.href = action;
			attribute.class += " action";
			attribute.target = "-blank";
		default:
	}
	return item;
}
function filter(item) { return item instanceof Object }
class Carousel {
	#waitTime = 10000;
	get waitTime() { return this.#waitTime }
	set waitTime(value) {
		const temp = Number(value);
		if (!isFinite(temp) || temp < 1000) return;
		this.#waitTime = temp;
		this.#resetInterval();
	}
	#running = false;
	get running() { return this.#running }
	#intervalId = null;
	#size;
	#box;
	#float;
	#navi;
	#pagination;
	#scroll;
	#throttle = new VerticalSyncThrottle(this.#renderFloat.bind(this));
	#current = 0;
	#renderFloat() {
		const { scrollLeft, clientWidth } = this.#scroll;
		this.#float.transform = `translateX(${scrollLeft / clientWidth * 1.5}rem)`;
	}
	#onScroll() {
		this.#throttle.trigger();
		const scroll = this.#scroll;
		this.#pagination.value = this.#current = round(scroll.scrollLeft / scroll.clientWidth);

	}
	#change(page) {
		const scroll = this.#scroll;
		scroll.scrollTo({ left: page * scroll.clientWidth, behavior: "smooth" });
	}
	#formChange() { this.#change(Number(this.#pagination.value)) }
	#next() {
		const next = this.#current + 1;
		this.#change(next > -1 && next < this.#size ? next : 0);
	}
	#prev() {
		const prev = this.#current - 1, size = this.#size;
		this.#change(prev > -1 && prev < size ? prev : size - 1);
	}
	#resetInterval() {
		if (!this.#running) return;
		clearInterval(this.#intervalId);
		this.#intervalId = setInterval(this.#next.bind(this), this.#waitTime);
	}
	#resume() {
		if (!this.#running) return;
		this.#intervalId = setInterval(this.#next.bind(this), this.#waitTime);
	}
	#pause() {
		if (!this.#running) return;
		clearInterval(this.#intervalId);
	}
	#start() {
		if (this.#running) return;
		this.#running = true;
		this.#intervalId = setInterval(this.#next.bind(this), this.#waitTime);
	}
	constructor(data, start = false) {
		if (!Array.isArray(data)) throw new TypeError("Failed to construct 'Carousel': Argument 'data' is not an array.");
		const items = data.filter(filter).map(buildItem);
		const number = this.#size = items.length;
		const paginations = [["div", null, { class: "bs-carousel-paginations-float" }, "float"]];
		for (let i = 0; i < number; ++i) paginations.push(["input", null, { type: "radio", class: "bs-carousel-paginations-item", name: "bs-carousel-page", value: i }]);
		const nodes = parseAndGetNodes([["div", [
			["div", items, { class: "bs-carousel-scroll", [EVENT_LISTENERS]: [["scroll", this.#onScroll.bind(this), { passive: true }]] }, "scroll"],
			["form", paginations, { class: "bs-carousel-paginations", [EVENT_LISTENERS]: [["change", this.#formChange.bind(this), { passive: true }]] }, "navi"],
			["button", , { class: "bs-carousel-arrow prev", [EVENT_LISTENERS]: [["click", this.#prev.bind(this), { passive: true }]] }],
			["button", , { class: "bs-carousel-arrow next", [EVENT_LISTENERS]: [["click", this.#next.bind(this), { passive: true }]] }]
		], {
				class: "bs-carousel-box", [EVENT_LISTENERS]: [
					["mouseenter", this.#pause.bind(this), { passive: true }],
					["mouseleave", this.#resume.bind(this), { passive: true }]
				]
			}, "box"]]).nodes;
		const box = this.#box = nodes.box;
		if (number < 2) {
			box.classList.add("single");
			return;
		}
		this.#float = nodes.float.style;
		const navi = this.#navi = nodes.navi;
		this.#pagination = navi.elements["bs-carousel-page"];
		this.#scroll = nodes.scroll;
		if (start) this.#start();
	}
	get element() { return this.#box }
	start() { if (this.#size > 1) this.#start() }
	stop() {
		if (!this.#running) return;
		this.#running = false;
		clearInterval(this.#intervalId);
	}
	static create(data, target) {
		if (!(target instanceof HTMLElement || target instanceof DocumentFragment || target instanceof Document)) throw new TypeError("Failed to execute 'create' on 'Carousel': Argument 'target' cannot append elements.")
		const temp = new Carousel(data, true);
		target.appendChild(temp.#box);
		return temp;
	}
	static {
		Object.defineProperty(this.prototype, Symbol.toStringTag, {
			value: this.name,
			configurable: true
		});
	}
}
export default Carousel;