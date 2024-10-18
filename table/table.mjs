import { EVENT_LISTENERS, parse, parseAndGetNodes } from "../../js/module/ArrayHTML.mjs";

{
	const style = document.createElement("style");
	style.textContent = await (await fetch("/component/table/table.css")).text();
	document.head.appendChild(style);
}
const ellipsis = ["span", "…"], cssLengthExp = /^\d+(?:\.\d+)?(?:px|cm|mm|ex|ch|em|rem|vw)$/;

function parseChildColumn(data, contents, dom, columns) {
	if (!Array.isArray(data)) throw new TypeError("Failed to execute 'setColumns' on 'Table': Non-array.");
	for (const item of data) {
		if (typeof item != "object" || !item) throw new TypeError("Failed to execute 'setColumns' on 'Table': Non-object in array.");
		if ("children" in item) {
			const name = item.name ?? "";
			if (typeof name != "string") throw new TypeError("Failed to execute 'setColumns' on 'Table': Invalid column name.");
			const style = {}, topStyle = {}, subDom = [["th", item.title, { style: topStyle, "data-name": name }]], subColumns = [];
			dom.push(["div", subDom, { class: "table-column-group", style }]);
			parseChildColumn(item.children, contents, subDom, subColumns);
			style.gridColumn = topStyle.gridColumn = "span " + subColumns.length;
			style.gridTemplateColumns = subColumns.join(" ");
			columns.push(...subColumns);
		} else {
			const { width, content } = item, name = item.name ?? "";
			if (typeof name != "string") throw new TypeError("Failed to execute 'setColumns' on 'Table': Invalid column name.");
			if (!cssLengthExp.test(width)) throw new Error("Failed to execute 'setColumns' on 'Table': Invalid width value.");
			if (typeof content != "object" || !content) throw new TypeError("Failed to execute 'setColumns' on 'Table': Invalid content configure.");
			let parsed;
			switch (content.type) {
				case "field":
					parsed = content.name;
					if (typeof parsed != "string") throw new TypeError("Failed to execute 'setColumns' on 'Table': Invalid content configure.");
					break;
				case "template":
					parsed = content.eval;
					if (typeof parsed != "function") throw new TypeError("Failed to execute 'setColumns' on 'Table': Invalid content configure.");
					break;
				default: throw new TypeError("Failed to execute 'setColumns' on 'Table': Invalid content configure.");
			}
			contents.push({ name, content: parsed });
			columns.push(item.autoExpand ? `minmax(${width}, 1fr)` : width);
			dom.push(["th", item.title, { "data-name": name }]);
		}

	}
}

function generateRows(columns, data, startIndex = 0) {
	const temp = [];
	for (const item of data) {
		const row = [];
		for (const { name, content: config } of columns) {
			let content;
			switch (typeof config) {
				case "string":
					content = String(item[config]);
					break;
				case "symbol":
					// content = ;
					break;
				case "function":
					content = config(item, startIndex);
			}
			row.push(["td", content, { "data-name": name }]);
		}
		temp.push(["tr", row, { "data-index": startIndex++ }]);
	}
	return parse(temp);
}

function defaultDataProcessor(data, paginate) {
	const temp = {
		successed: Boolean(data.code),
		data: data.data
	}
	if (paginate) temp.total = data.total;
	return temp;
}

class TableEvent extends Event {
	constructor(type, table, row, column, data = null) {
		super(type);
		this.table = table;
		this.row = row;
		this.column = column;
		this.data = data;
	}
	static {
		Object.defineProperty(this.prototype, Symbol.toStringTag, {
			value: this.name,
			configurable: true
		});
	}
}

function nodeTrace(top, node) {
	var l1, l2;
	while (node != top) {
		l2 = l1;
		l1 = node;
		node = node.parentElement;
	}
	return {
		row: Number(l1?.dataset.index),
		column: l2?.dataset.name
	}
}

class Table extends EventTarget {
	#header;
	#list;
	#paginateStyle;
	#pages;
	#jumperStyle;
	#jumpInput;
	#totalDisplay;
	#total = 0;
	#totalPages = 0;
	#tableStyle;

	#listClickHandler({ target }) {
		const cell = this.#getNodeCell(target);
		if (!cell) return
		const row = cell.row;
		if (isNaN(row)) return;
		this.dispatchEvent(new TableEvent("rowclick", this, row, cell.column, this.#data[row]));
	}

	#getNodeCell(node) {
		const list = this.#list;
		if (!list.contains(node)) return null;
		return nodeTrace(list, node);
	}
	getNodeCell(node) { return this.#getNodeCell(node) }

	constructor(element) {
		super();
		/** @ts-ignore @type {{table: HTMLTableElement,header: HTMLTableSectionElement,list: HTMLTableSectionElement,paginate: HTMLDivElement,pages: HTMLDivElement,jumper:HTMLSpanElement,jumpInput: HTMLInputElement,totalDisplay: HTMLSpanElement}} */
		const { table, header, list, paginate, pages, jumper, jumpInput, totalDisplay } = parseAndGetNodes([
			["table", [
				["thead", , , "header"],
				["tbody", , , "list"]
			], {}, "table"],
			["div", [
				["div", null, { class: "table-pages" }, "pages"],
				["div", [
					["span", ["第 ", ["input", , { type: "number", min: "1", [EVENT_LISTENERS]: [["change", this.#inputJump.bind(this)]] }, "jumpInput"], " 页 / "]],
					"共 ", ["#text", "0", , "totalDisplay"], " 页"
				], { class: "table-jump" }, "jumper"]
			], { class: "table-paginate" }, "paginate"]
		], element);
		element.classList.add("table-frame");
		this.#header = header;
		this.#list = list;
		this.#paginateStyle = paginate.style;
		this.#pages = pages;
		this.#jumperStyle = jumper.style;
		this.#jumpInput = jumpInput;
		this.#totalDisplay = totalDisplay;
		this.#tableStyle = table.style;
		list.addEventListener("click", this.#listClickHandler.bind(this));
	}
	#inputJump() {
		const paginate = this.#dataConfig?.paginate;
		if (!paginate) return;
		const input = this.#jumpInput, value = Number(input.value);
		if (Number.isInteger(value) && value > 0 && value <= this.#totalPages) {
			paginate.currentPage = value;
			this.#updateData();
		} else input.value = paginate.currentPage;
	}
	#buttonJump(event) {
		const paginate = this.#dataConfig?.paginate;
		if (!paginate) return;
		paginate.currentPage = Number(event.target.dataset.page);
		this.#updateData();
	}

	jump(page) {
		if (arguments.length < 1) throw new TypeError("Failed to execute 'jump' on 'Table': 1 argument required, but only 0 present.");
		if (typeof page != "number" || !Number.isInteger(page)) throw new TypeError("Failed to execute 'jump' on 'Table': Argument 'page' is not a integer.");
		const paginate = this.#dataConfig?.paginate;
		if (!paginate) return;
		if (page > 0) {
			paginate.currentPage = page;
			this.#updateData();
		} else throw new TypeError("Failed to execute 'jump' on 'Table': Out of range.");
	}

	#generatePages() {
		const paginate = this.#dataConfig?.paginate,
			pages = this.#pages,
			input = this.#jumpInput,
			total = this.#totalPages;
		pages.innerHTML = '';
		if (paginate && total) {
			this.#paginateStyle.display = "grid";
		} else {
			this.#totalDisplay.textContent = input.max = input.value = 1;
			this.#paginateStyle.display = null;
			return;
		}
		const { currentPage } = paginate;
		input.value = currentPage;
		this.#totalDisplay.textContent = input.max = total;
		if (total < 2) {
			pages.style.display = this.#jumperStyle.display = "none";
			return;
		} else pages.style.display = this.#jumperStyle.display = null;
		const boundListener = [["click", this.#buttonJump.bind(this)]],
			index = { "1": ["button", "1", { class: "table-page", "data-page": "1", [EVENT_LISTENERS]: boundListener }] },
			temp = [index["1"]];
		if (total > 5) {
			const tailCenter = total - 2;
			if (currentPage > 3) temp.push(ellipsis);
			for (let i = currentPage < 3 ? 2 : currentPage > tailCenter ? total - 3 : currentPage - 1, end = i + 3; i < end; ++i)
				temp.push(index[i] = ["button", i, { class: "table-page", "data-page": i, [EVENT_LISTENERS]: boundListener }]);
			if (currentPage < tailCenter) temp.push(ellipsis);
			const last = ["button", total, { class: "table-page", "data-page": total, [EVENT_LISTENERS]: boundListener }];
			temp.push(last);
			index[total] = last;
		} else {
			const end = total + 1;
			for (let i = 2; i < end; ++i)
				temp.push(index[i] = ["button", i, { class: "table-page", "data-page": i, [EVENT_LISTENERS]: boundListener }]);
		}
		index[currentPage][2].class += " current";
		pages.appendChild(parse(temp));
	}

	#columns = [];
	setColumns(data) {
		if (arguments.length < 1) throw new TypeError("Failed to execute 'setColumns' on 'Table': 1 argument required, but only 0 present.");
		if (!Array.isArray(data)) throw new TypeError("Failed to execute 'setColumns' on 'Table': Argument 'data' is not an array.");
		const contents = [], dom = [], columnsWidth = [];
		parseChildColumn(data, contents, dom, columnsWidth);
		const header = this.#header;
		header.innerHTML = this.#list.innerHTML = "";
		header.appendChild(parse(dom));
		this.#tableStyle.setProperty("--table-columns", columnsWidth.join(" "));
		this.#columns = contents;
		this.#updateData();
	}

	#data = null;
	#dataConfig = null;
	setData(data) {
		if (arguments.length < 1) throw new TypeError("Failed to execute 'setData' on 'Table': 1 argument required, but only 0 present.");
		if (!(data instanceof Object)) throw new TypeError("Failed to execute 'setData' on 'Table': Argument 'data' is not an object.");
		var config;
		if (data.network) {
			config = {
				network: true,
				url: new URL(data.url, location.origin),
				processor: defaultDataProcessor
			};
			var method = data.method ?? "GET";
			if (typeof method != "string") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid request method.");
			method = method.toUpperCase();
			if (method != "GET" && method != "POST") throw new Error("Failed to execute 'setData' on 'Table': Invalid request method.");
			config.post = method == "POST";
			const { params, paginate, dataProcessor, headers } = data, paramType = typeof params, headersType = typeof headers;
			if (headersType != "object" && headersType != "undefined") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid request heeaders.");
			if (paramType != "object" && paramType != "undefined") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid request parameters.");
			config.params = params;
			config.headers = headers;
			if (paginate) {
				if (typeof paginate != "object") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid paginate option.");
				const paginateConfig = config.paginate = {},
					{ pageSizeParam, pageSize, pageParam, currentPage } = paginate;
				if (typeof pageSizeParam != "string") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid page size parameter name.");
				paginateConfig.pageSizeParam = pageSizeParam;
				if (typeof pageSize != "number" || !Number.isInteger(pageSize) || pageSize < 1) throw new TypeError("Failed to execute 'setData' on 'Table': Invalid page size.");
				paginateConfig.pageSize = pageSize;
				if (typeof pageParam != "string") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid page parameter name.");
				paginateConfig.pageParam = pageParam;
				switch (typeof currentPage) {
					case "number":
						if (!Number.isInteger(currentPage)) new Error("Failed to execute 'setData' on 'Table': Invalid current page.");
					case "bigint":
						if (currentPage < 1) new Error("Failed to execute 'setData' on 'Table': Invalid current page.");
						break
					default:
						throw new TypeError("Failed to execute 'setData' on 'Table': Invalid current page.");
				}
				paginateConfig.currentPage = currentPage;
			}
			if (dataProcessor) {
				if (typeof dataProcessor != "function") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid data processor.");
				config.processor = dataProcessor;
			}
		} else {
			config = { network: false };
			const { data: dataArray, paginate } = data;
			if (!Array.isArray(dataArray)) throw new TypeError("Failed to execute 'setData' on 'Table': Invalid data.");
			if (paginate) {
				if (typeof paginate != "object") throw new TypeError("Failed to execute 'setData' on 'Table': Invalid paginate option.");
				const paginateConfig = config.paginate = {}, { pageSize, currentPage } = paginate;
				if (typeof pageSize != "number" || !Number.isInteger(pageSize) || pageSize < 1) throw new TypeError("Failed to execute 'setData' on 'Table': Invalid page size.");
				paginateConfig.pageSize = pageSize;
				switch (typeof currentPage) {
					case "number":
						if (!Number.isInteger(currentPage)) new Error("Failed to execute 'setData' on 'Table': Invalid current page.");
					case "bigint":
						if (currentPage < 1) new Error("Failed to execute 'setData' on 'Table': Invalid current page.");
						break
					default:
						throw new TypeError("Failed to execute 'setData' on 'Table': Invalid current page.");
				}
				paginateConfig.currentPage = currentPage;
				config.data = dataArray;
			} else this.#data = dataArray;
			this.#total = dataArray.length;
		}
		this.#dataConfig = config;
		this.#updateData();
	}

	async #updateData(appendMode = false) {
		const networkMission = this.#networkMission,
			config = this.#dataConfig;
		if (!config) return;
		const paginate = config.paginate;
		if (paginate && appendMode) throw new Error("Cannot use append mode while paginate enabled.")
		if (networkMission) {
			networkMission.abort();
			this.#networkMission = null;
		}
		const lastTotal = this.#total;
		var total, data;
		if (config.network) {
			const { post, params, processor } = config,
				abort = new AbortController,
				/** @type {RequestInit} */
				request = { method: post ? "POST" : "GET", signal: abort.signal, headers: config.headers }, url = new URL(config.url);
			let payload;
			if (post) {
				if (params) {
					if (params instanceof HTMLFormElement) {
						payload = new FormData(params);
					} else {
						payload = new FormData;
						if (params instanceof FormData) {
							for (const [key, value] of params.entries()) payload.append(key, value);
						} else for (const key in params) payload.append(key, params[key]);
					}
				} else payload = new FormData;
			} else {
				payload = url.searchParams;
				if (params) for (const key in params) payload.append(key, params[key]);
			}
			request.body = payload;
			if (paginate) {
				payload.append(paginate.pageSizeParam, paginate.pageSize);
				payload.append(paginate.pageParam, paginate.currentPage);
			}
			this.#networkMission = abort;
			let result;
			try {
				const response = await fetch(url, request);
				if (!response.ok) throw null;
				result = await response.json();
			} catch (_) {
				this.#networkMission = null;
				return;
			}
			this.#networkMission = null;
			const parsed = processor(result, paginate);
			if (!parsed.successed) return;
			data = parsed.data;
			if (!Array.isArray(data)) return;
			this.#data = data;
			total = this.#total = paginate ? parsed.total : data.length;
		} else {
			if (paginate) {
				const allData = config.data;
				data = this.#data = allData.slice((paginate.currentPage - 1) * paginate.pageSize);
				total = this.#total = allData.length;
			} else {
				data = this.#data;
				total = this.#total = data.length;
			}
		}
		const list = this.#list;
		if (appendMode) {
			list.appendChild(generateRows(this.#columns, data.slice(lastTotal), lastTotal));
		} else {
			if (paginate) this.#totalPages = Math.ceil(total / paginate.pageSize);
			this.#generatePages();
			list.innerHTML = "";
			list.appendChild(generateRows(this.#columns, data));
		}
	}
	#networkMission = null;

	updateData(appendMode) { return this.#updateData(appendMode) }
	updateRow(index) {
		const data = this.#data;
		if (index < 0 || !(index < data?.length)) throw new RangeError();
		this.#list.children[index].replaceWith(generateRows(this.#columns, [data[index]], index));
	}
	removeRow(index) {
		const data = this.#data;
		if (index < 0 || !(index < data?.length)) throw new RangeError();
		data.splice(index, 1);
		const children = this.#list.children, end = children.length - 1;
		for (children[index].remove(); index < end; ++index)
			children[index].dataset.index = index;
	}
	clear() {
		this.#list.innerHTML = "";
		this.#data = [];
		this.#paginateStyle.display = null;
	}

	static {
		Object.defineProperty(this.prototype, Symbol.toStringTag, {
			value: this.name,
			configurable: true
		});
	}
}
export { Table };
export default Table;