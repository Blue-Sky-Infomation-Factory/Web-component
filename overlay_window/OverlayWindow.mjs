import { parse, parseAndGetNodes, EVENT_LISTENERS } from "../../javascript/module/array_HTML.mjs";
import { loadCss } from "../utils.mjs";

await loadCss(import.meta.resolve("overlay_window.css"));

/** @type {{
 * layer: HTMLDivElement,
 * windowBody: HTMLDivElement,
 * windowTitle: HTMLSpanElement,
 * windowQueue: HTMLSpanElement,
 * windowClose: HTMLButtonElement,
 * windowContent: HTMLDivElement,
 * contentFrame: HTMLDivElement,
 * subLayer: HTMLDivElement,
 * subTitle: HTMLSpanElement,
 * subFrame: HTMLDivElement,
 * subBody: HTMLDivElement 
 * }} */
// @ts-ignore
const { layer, windowBody, windowTitle, windowQueue, windowClose, windowContent, contentFrame, subLayer, subTitle, subFrame, subBody } = parseAndGetNodes([
	["div", [
		["div", [
			["div", [
				["span", null, { id: "overlay-window-title" }, "windowTitle"],
				["span", "0", { id: "overlay-window-queue", title: "正在排队的弹窗数量" }, "windowQueue"],
				["button", null, { id: "overlay-window-close", class: "overlay-window-button", title: "关闭" }, "windowClose"]
			], { id: "overlay-window-top" }],
			["hr", null, { class: "overlay-window-hr" }],
			["div", [
				["div", null, { id: "overlay-window-content" }, "windowContent"]
			], { id: "overlay-window-content-frame" }, "contentFrame"],
			["div", [
				["div", [
					["span", null, { id: "overlay-window-sub-title" }, "subTitle"],
					["hr", null, { class: "overlay-window-hr" }],
					["div", null, { id: "overlay-window-sub-content-frame" }, "subFrame"]
				], { id: "overlay-window-sub" }, "subBody"]
			], { id: "overlay-window-sub-layer" }, "subLayer"]
		], { id: "overlay-window" }, "windowBody"]
	], { id: "overlay-window-layer" }, "layer"]
], document.body), STYLE_NAMES = {
	backgroundColor: "background-color",
	textColor: "text-color",
	interactiveColor: "interactive-color",
	interactiveHoverColor: "interactive-hover-color",
	interactiveActiveColor: "interactive-active--color",
	interactiveTextColor: "interactive-text-color",
	interactiveHoverTextColor: "interactive-hover-text-color",
	interactiveActiveTextColor: "interactive-active-text-color"
}, queue = [], windowStyle = windowBody.style;
var pending = false, subWindowPending = false, closeCurrent = null, abortCurrentSub = null, unshiftMode = false;
function preventBubble(event) { event.stopPropagation() }
class OverlayWindowController {
	instance;
	data;
	constructor(instance, data) {
		this.instance = instance;
		this.data = data;
	}
	pending = true;
	active = false;
	closed = false;
	blocked = true;
	subWindows = [];
	static {
		Object.defineProperty(this.prototype, Symbol.toStringTag, {
			value: this.name,
			configurable: true
		});
	}
}
class SubWindowController {
	promise = Promise.withResolvers();
	type;
	title;
	content;
	shown = false;
	constructor(type, title, content) {
		this.type = type;
		this.title = title;
		this.content = content;
	}
	static {
		Object.defineProperty(this.prototype, Symbol.toStringTag, {
			value: this.name,
			configurable: true
		});
	}
}
class OverlayWindow extends EventTarget {
	static #checkInstance(instance) { if (!(instance instanceof this)) throw new TypeError("Illegal invocation") }
	#onshow = null;
	#onshown = null;
	#onclose = null;
	#onclosed = null;
	get onshow() { return this.#onshow }
	get onshown() { return this.#onshown }
	get onclose() { return this.#onclose }
	get onclosed() { return this.#onclosed }
	#onshowHandler(event) { if (this.#onshow) this.#onshow(event) }
	set onshow(value) {
		super.removeEventListener("show", this.#onshowHandler);
		if (typeof value == "function") {
			super.addEventListener("show", this.#onshowHandler);
			this.#onshow = value
		} else this.#onshow = null;
	}
	#onshownHandler(event) { if (this.#onshown) this.#onshown(event) }
	set onshown(value) {
		super.removeEventListener("shown", this.#onshownHandler);
		if (typeof value == "function") {
			super.addEventListener("shown", this.#onshownHandler);
			this.#onshown = value
		} else this.#onshown = null;
	}
	#oncloseHandler(event) { if (this.#onclose) this.#onclose(event) }
	set onclose(value) {
		super.removeEventListener("close", this.#oncloseHandler);
		if (typeof value == "function") {
			super.addEventListener("close", this.#oncloseHandler);
			this.#onclose = value
		} else this.#onclose = null;
	}
	#onclosedHandler(event) { if (this.#onclosed) this.#onclosed(event) }
	set onclosed(value) {
		super.removeEventListener("closed", this.#onclosedHandler);
		if (typeof value == "function") {
			super.addEventListener("closed", this.#onclosedHandler);
			this.#onclosed = value
		} else this.#onclosed = null;
	}
	#controller;
	get active() { return this.#controller.active }
	get closed() { return this.#controller.closed }
	get blocked() { return this.#controller.blocked }
	constructor(content, title = undefined, options = null) {
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof content != "string" && !(content instanceof Node)) throw new TypeError("Argument 'content' is not a string or HTML node.");
		if (typeof options != "object") throw new TypeError("Argument 'options' is not an object.");
		super();
		queueUp(this.#controller = new OverlayWindowController(this, { content, title, options }));
	}
	blockSwitch(toState = undefined) {
		OverlayWindow.#checkInstance(this);
		return blockContentSwitch(this.#controller, toState);
	}
	close() {
		OverlayWindow.#checkInstance(this);
		closeInstance(this.#controller);
	}
	after(content, title = undefined, options = null) {
		OverlayWindow.#checkInstance(this);
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof content != "string" && !(content instanceof Node)) throw new TypeError("Argument 'content' is not a string or HTML node.");
		if (typeof options != "object") throw new TypeError("Argument 'options' is not an object.");
		if (!this.#controller.active) throw new Error("The instance is not active.");
		unshiftMode = true;
		const temp = new OverlayWindow(content, title, options);
		unshiftMode = false;
		return temp;
	}
	#subWindowCheck() { if (this.#controller.closed) throw new Error(`The instance is closed.`) }
	async #createSub(controller) {
		const main = this.#controller, queue = main.subWindows;
		queue.push(controller);
		if (main.active && !subWindowPending) subWindowWorkflow(queue);
		try { await controller.promise.promise } catch (_ignore) { return }
		if (!controller.shown) queue.splice(queue.indexOf(controller), 1);
	}
	alert(message) {
		OverlayWindow.#checkInstance(this);
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof message != "string") throw new TypeError("Argument 'message' is not a string.");
		this.#subWindowCheck();
		const controller = new SubWindowController("alert", "提示", parse([
			["div", message, { class: "overlay-window-message" }],
			["div", [["button", "确认", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { resolve() }, { once: true, passive: true }]] }]], { class: "overlay-window-buttons" }]
		])), { promise, resolve } = controller.promise;
		this.#createSub(controller);
		return promise;
	}
	confirm(message, textOfYes = null, textOfNo = null) {
		OverlayWindow.#checkInstance(this);
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof message != "string") throw new TypeError("Argument 'message' is not a string.");
		this.#subWindowCheck();
		const controller = new SubWindowController("confirm", "确认", parse([
			["div", message, { class: "overlay-window-message" }],
			["div", [
				["button", typeof textOfYes == "string" ? textOfYes : "是", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { resolve(true) }, { once: true, passive: true }]] }],
				["button", typeof textOfNo == "string" ? textOfNo : "否", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { resolve(false) }, { once: true, passive: true }]] }]
			], { class: "overlay-window-buttons" }]
		])), { resolve, promise } = controller.promise;
		this.#createSub(controller);
		return promise;
	}
	wait(message) {
		OverlayWindow.#checkInstance(this);
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof message != "string") throw new TypeError("Argument 'message' is not a string.");
		this.#subWindowCheck();
		const controller = new SubWindowController("wait", "请等待", parse([
			["div", null, { class: "overlay-window-cycle" }],
			["div", message, { class: "overlay-window-message" }]
		]));
		this.#createSub(controller);
		return controller.promise.resolve;
	}
	prompt(message, defaultText = "") {
		OverlayWindow.#checkInstance(this);
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof message != "string") throw new TypeError("Argument 'message' is not a string.");
		if (typeof defaultText != "string") throw new TypeError("Argument 'defaultText' is not a string.");
		this.#subWindowCheck();
		/** @ts-ignore @type {{documentFragment: DocumentFragment, nodes: {input: HTMLInputElement}}} */
		const { documentFragment, nodes: { input } } = parseAndGetNodes([
			["div", message, { class: "overlay-window-message" }],
			["input", null, { class: 'overlay-window-input', value: defaultText }, 'input'],
			["div", [
				["button", "确定", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { resolve(input.value) }, { once: true, passive: true }]] }],
				["button", "取消", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { reject(new DOMException("User canceled.", "UserCanceled")) }, { once: true, passive: true }]] }]
			], { class: "overlay-window-buttons" }]
		])
		const controller = new SubWindowController("prompt", "输入", documentFragment), { resolve, reject, promise } = controller.promise;
		this.#createSub(controller);
		return promise;
	}
	static {
		Object.defineProperty(this.prototype, Symbol.toStringTag, {
			value: this.name,
			configurable: true
		});
	}
	static alert(content, title = null) {
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof content != "string" && !(content instanceof Node)) throw new TypeError("Argument 'content' is not a string or HTML node.");
		const { promise, resolve } = Promise.withResolvers(), miniWindow = new OverlayWindow(parse([
			["div", content, { class: "overlay-window-message" }],
			["div", [["button", "确认", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { resolve(); miniWindow.close() }, { once: true, passive: true }]] }]], { class: "overlay-window-buttons" }]
		]), typeof title == "string" ? title : "提示", { noManualClose: true, size: { width: "384px" }, containerClassName: "overlay-window-dialog-frame" });
		return promise;
	}
	static confirm(content, title = null, textOfYes = null, textOfNo = null) {
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof content != "string" && !(content instanceof Node)) throw new TypeError("Argument 'content' is not a string or HTML node.");
		const { promise, resolve } = Promise.withResolvers(), miniWindow = new OverlayWindow(parse([
			["div", content, { class: "overlay-window-message" }],
			["div", [
				["button", typeof textOfYes == "string" ? textOfYes : "是", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { resolve(true); miniWindow.close() }, { once: true, passive: true }]] }],
				["button", typeof textOfNo == "string" ? textOfNo : "否", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { resolve(false); miniWindow.close() }, { once: true, passive: true }]] }]
			], { class: "overlay-window-buttons" }]
		]), typeof title == "string" ? title : "确认", { noManualClose: true, size: { width: "384px" }, containerClassName: "overlay-window-dialog-frame" });
		return promise;
	}
	static wait(message, title = null) {
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof message != "string") throw new TypeError("Argument 'message' is not a string.");
		return closeInstance.bind(null, new OverlayWindow(parse([
			["div", null, { class: "overlay-window-cycle" }],
			["div", message, { class: "overlay-window-message" }]
		]), typeof title == "string" ? title : "请等待", { noManualClose: true, containerClassName: "overlay-window-dialog-frame wait" }).#controller);
	}
	static prompt(message, defaultText = "") {
		if (arguments.length < 1) throw new TypeError("1 argument required, but only 0 present.");
		if (typeof message != "string") throw new TypeError("Argument 'message' is not a string.");
		if (typeof defaultText != "string") throw new TypeError("Argument 'defaultText' is not a string.");
		/** @ts-ignore @type {{documentFragment: DocumentFragment, nodes: {input: HTMLInputElement}}} */
		const { documentFragment, nodes: { input } } = parseAndGetNodes([
			["div", message, { class: "overlay-window-message" }],
			["input", null, { class: 'overlay-window-input', value: defaultText }, 'input'],
			["div", [
				["button", "确定", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { miniWindow.close(); resolve(input.value) }, { once: true, passive: true }]] }],
				["button", "取消", { class: "overlay-window-button", [EVENT_LISTENERS]: [["click", () => { miniWindow.close(); reject(new DOMException("User canceled.", "AbortError")) }, { once: true, passive: true }]] }]
			], { class: "overlay-window-buttons" }]
		]), { resolve, reject, promise } = Promise.withResolvers(), miniWindow = new OverlayWindow(documentFragment, "输入", { noManualClose: true, size: { width: "384px" }, containerClassName: "overlay-window-dialog-frame" });
		return promise;
	}
}
function clearContent() {
	windowBody.style = windowClose.style = windowContent.style = windowTitle.innerHTML = windowContent.innerHTML = contentFrame.className = windowContent.className = "";
	for (const i in STYLE_NAMES) windowStyle.setProperty(`--overlay-window-${STYLE_NAMES[i]}`, null);
}
function setStyle(data) {
	if (!(data instanceof Object)) return;
	for (const i in STYLE_NAMES) if (i in data) windowStyle.setProperty(`--overlay-window-${STYLE_NAMES[i]}`, data[i]);
}
const sizeFormat = /^\d+%$/;
function setSize(data) {
	if (!(data instanceof Object)) return;
	if ("width" in data) {
		const width = data.width;
		(sizeFormat.test(width) ? windowBody : windowContent).style.width = width;
	}
	if ("height" in data) {
		const height = data.height;
		(sizeFormat.test(height) ? windowBody : windowContent).style.height = height;
	}
}
function setContent(data) {
	const { content, title, options } = data;
	windowTitle.innerText = title ?? "提示";
	windowContent.innerHTML = "";
	switch (typeof content) {
		case "string":
			windowContent.innerText = content;
			break;
		case "object":
			windowContent.appendChild(content);
			break;
	}
	windowContent.scrollTo(0, 0);
	if (!options) return;
	if (options.noManualClose) windowClose.style.display = "none";
	if ("size" in options) setSize(options.size);
	if ("style" in options) setStyle(options.style);
	if ("containerClassName" in options) windowContent.className = options.containerClassName;
}
function fadeIn(target) {
	return new Promise(function (resolve) {
		target.addEventListener("animationend", function (event) { preventBubble(event); target.className = ""; resolve() }, { once: true, passive: true });
		target.className = "in";
	})
}
function fadeOut(target) {
	return new Promise(function (resolve) {
		target.addEventListener("animationend", function (event) { preventBubble(event); target.className = ""; resolve() }, { once: true, passive: true });
		target.className = "out";
	})
}
async function workflow() {
	if (!queue.length) {
		pending = false;
		return;
	}
	layer.style.display = "grid";
	var target = layer;
	while (true) {
		const controller = queue.shift(), { instance, subWindows } = controller;
		controller.pending = false;
		updateQueueNumber();
		setContent(controller.data);
		controller.data = null;
		const close = new Promise(waitClose);
		controller.active = true;
		instance.dispatchEvent(new Event("show"));
		if (subWindows.length) subWindowWorkflow(subWindows);
		await fadeIn(target);
		instance.dispatchEvent(new Event("shown"));
		await close;
		closeCurrent = null;
		controller.active = false;
		controller.closed = true;
		if (subWindowPending) clearSubWindows(controller);
		instance.dispatchEvent(new Event("close"));
		await fadeOut(target = queue.length ? windowBody : layer);
		instance.dispatchEvent(new Event("closed"));
		clearContent();
		if (target == windowBody && !queue.length) {
			windowStyle.display = "none";
			await fadeOut(target = layer);
			windowStyle.display = null;
		}
		if (!queue.length) break;
	}
	layer.style.display = null;
	pending = false;
}
// @ts-ignore
function updateQueueNumber() { windowQueue.innerText = queue.length > 99 ? "99+" : queue.length }
function queueUp(controller) {
	if (unshiftMode) {
		queue.unshift(controller);
		updateQueueNumber();
		return;
	}
	queue.push(controller);
	updateQueueNumber();
	if (pending) return;
	pending = true;
	queueMicrotask(workflow);
}
function waitClose(resolve) { closeCurrent = resolve }
function closeInstance(controller) {
	if (controller.closed) return;
	controller.closed = true;
	if (controller.pending) {
		queue.splice(queue.indexOf(controller), 1);
		updateQueueNumber();
	} else closeCurrent();
}
function blockContentSwitch(controller, toState) {
	if (!controller.active) return false;
	contentFrame.className = (controller.blocked = toState ?? !controller.blocked) ? "blocked" : "";
	return true;
}
function close(event) {
	if (!event.isTrusted) throw new Error("OverlayWindow only accept user gesture!");
	if (closeCurrent) closeCurrent();
}
async function showSub(type, title, content) {
	subTitle.innerText = title;
	subFrame.className = type;
	subFrame.appendChild(content);
	subLayer.style.display = "grid";
	await fadeIn(subBody);
}
async function closeSub() {
	await fadeOut(subBody);
	clearSubContent();
}
function clearSubContent() {
	subLayer.style.display = null;
	subTitle.innerText = subFrame.className = subFrame.innerHTML = "";
}
function clearSubWindows(controller) {
	if (abortCurrentSub) abortCurrentSub(new Error("OverlayWindow closed"));
	for (const item of controller.subWindows.splice(0)) item.promise.reject(new Error("OverlayWindow closed"));
}
async function subWindowWorkflow(queue) {
	subWindowPending = true;
	while (queue.length) {
		const instance = queue.shift(), promise = instance.promise;
		abortCurrentSub = promise.reject;
		instance.shown = true;
		showSub(instance.type, instance.title, instance.content);
		try { await promise.promise } catch (_ignore) { }
		abortCurrentSub = null;
		await closeSub();
	}
	subWindowPending = false;
}
function remove() { layer.remove() }
function reload() { document.body.appendChild(layer) }
function setCounterEnabled(enabled) { windowQueue.style.display = enabled ? "grid" : null }
windowClose.addEventListener("click", close, { passive: true });
contentFrame.addEventListener("animationend", preventBubble, { passive: true });
export default OverlayWindow;
export { OverlayWindow, remove, reload, setCounterEnabled }