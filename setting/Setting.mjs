import getStorage from "./SettingStorage.mjs";
import { IndexedDatabaseObjectStore } from "../../javascript/module/IndexedDatabase.mjs";
import { parseAndGetNodes, parse } from "../../javascript/module/array_HTML.mjs";
import { requestCss } from "../utils.mjs";

const style = document.createElement("style");
style.textContent = await requestCss(import.meta.resolve("./setting.css"));

async function buildList(instance, data, root) {
	const list = [];
	for (let item of data) list.push(await buildItem(instance, item, root));
	return ["div", list, { class: "bs-setting-list" }];
}
async function buildItem(instance, data, root) {
	switch (data.type) {
		case "collection":
			return buildCollection(instance, data, root);
		case "storage":
			switch (data.data) {
				case "switch":
					return await buildSwitch(instance, data);
				case "1":

				case "2":
			}
		case "action":
			return buildAction(instance, data);
		case "info":
			return buildInfo(data, root);
	}
}
function buildCollection(instance, data, root) {
	const element = parseAndGetNodes([["button", [["span", data.title, { class: "bs-setting-item-title" }]], { class: "bs-setting-item next" }, "element"]]).nodes.element;
	element.addEventListener("click", async function () { createSub(data.title, await buildList(instance, data.sub, root), root) });
	return element;
}
function buildAction(instance, data) {
	const element = parseAndGetNodes([["button", [["span", data.title, { class: "bs-setting-item-title" }]], { class: "bs-setting-item" }, "element"]]).nodes.element;
	element.addEventListener("click", function () { data.action(instance) });
	return element;
}
async function buildSwitch(instance, data) {
	const { element, switch: input } = parseAndGetNodes([["label", [
		["span", data.title, { class: "bs-setting-item-title" }],
		["input", null, { class: "bs-setting-switch", type: "checkbox" }, "switch"]
	], { class: "bs-setting-item switch" }, "element"]]).nodes, { storage } = instance;
	input.checked = await storage.get(data.path);
	input.addEventListener("change", function () { storage.set(data.path, input.checked) });
	return element;
}
function buildInfo(data, root) {
	const element = parseAndGetNodes([["button", [["span", data.title, { class: "bs-setting-item-title" }]], { class: "bs-setting-item next" }, "element"]]).nodes.element;
	element.addEventListener("click", function () { createSub(data.title, buildLoad(data.source), root) });
	return element;
}
function buildLoad(address) { return ["iframe", null, { src: address, class: "bs-setting-page" }, "element"] }
function createSub(title, content, root) {
	const { frame, back } = parseAndGetNodes([
		["div", [
			["div", [
				["button", "< 返回", { class: "bs-setting-frame-back" }, "back"],
				["span", title, { class: "bs-setting-title" }]
			], { class: "bs-setting-frame-title" }],
			content
		], { class: "bs-setting-frame-sub out" }, "frame"]
	]).nodes;
	back.addEventListener("click", function () {
		frame.addEventListener("transitionend", function () {
			frame.remove();
			root.classList.remove("blocked");
		}, { once: true });
		root.classList.add("blocked");
		frame.classList.add("out");
	})
	root.classList.add("blocked");
	root.appendChild(frame);
	frame.clientTop;
	frame.addEventListener("transitionend", function () { root.classList.remove("blocked") }, { once: true });
	frame.classList.remove("out");
}
class Setting {
	static #checkInstance(instance) { if (!(instance instanceof this)) throw new TypeError("Illegal invocation") }
	#storage;
	get storage() { return this.#storage }
	#tree;
	constructor(storage, tree) {
		this.#storage = storage;
		this.#tree = tree;
	}
	async home() {
		Setting.#checkInstance(this);
		const { documentFragment, nodes: { root } } = parseAndGetNodes([
			style,
			["div", null, { class: "bs-setting-frame" }, "root"]
		]);
		root.appendChild(parse([
			["div", [["span", "主菜单", { class: "bs-setting-title" }]], { class: "bs-setting-frame-title" }],
			await buildList(this, this.#tree, root)
		]));
		return documentFragment;
	}
	async direct(path) {
		Setting.#checkInstance(this);
		if (arguments.length < 1) throw new TypeError("Failed to execute 'direct' on 'Setting': 1 argument required, but only 0 present.");
		if (!Array.isArray(path)) throw new TypeError("Failed to execute 'direct' on 'Setting': Argument 'path' is not an Array.");
		if (!path.length) throw new Error("Failed to execute 'direct' on 'Setting': Invalid path");
		var list = this.#tree, target;
		for (let name of path) {
			if (!Array.isArray(list)) throw new Error("Failed to execute 'direct' on 'Setting': Invalid path.");
			let found;
			for (let item of list) if (item.name == name) {
				found = target = item;
				break;
			};
			if (!found) throw new Error("Failed to execute 'direct' on 'Setting': Invalid path.");
			list = target.sub;
		}
		const { documentFragment, nodes: { root } } = parseAndGetNodes([
			style,
			["div", null, { class: "bs-setting-frame" }, "root"]
		]);
		var page;
		switch (target.type) {
			case "collection":
				page = await buildList(this, target.sub, root);
				break;
			case "info":
				page = buildLoad(target.source);
				break;
			default:
				throw new Error("Failed to execute 'direct' on 'Setting': Invalid path");
		}
		root.appendChild(parse([
			["div", [["span", target.title, { class: "bs-setting-title" }]], { class: "bs-setting-frame-title" }],
			page
		]));
		return documentFragment;
	}
	static async open(storageSource, structure) {
		if (arguments.length < 2) throw new TypeError(`Failed to execute 'open': 2 arguments required, but only ${arguments.length} present.`);
		if (!(typeof storageSource == "string" || storageSource instanceof IndexedDatabaseObjectStore)) throw new TypeError("Failed to execute 'open': Argument 'storageSource' is not a string or not type of IndexedDatabaseObjectStore.");
		if (!(structure instanceof Object)) throw new TypeError("Failed to execute 'open': Argument 'structure' is not an object.");
		const { tree, storage } = structure;
		if (!Array.isArray(tree)) throw new TypeError("Failed to execute 'open': 'structure.tree' is not an Array.");
		if (!(storage instanceof Object)) throw new TypeError("Failed to execute 'open': 'structure.storage' is not an object.");
		return new Setting(await getStorage(storageSource, storage), tree)
	}
	static {
		Object.defineProperty(this.prototype, Symbol.toStringTag, {
			value: this.name,
			configurable: true
		});
	}
}
export default Setting;
export { Setting };