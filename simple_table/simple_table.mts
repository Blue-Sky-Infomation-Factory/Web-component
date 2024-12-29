import { ArrayHTMLCollection, ArrayHTMLNodeContent } from "/js/module/ArrayHTML.mjs";

type column = {
	title?: string,
	width: string,
	content:
	{ type: "field", name: string } |
	{ type: "template", eval: (data: any, index: number) => ArrayHTMLCollection | ArrayHTMLNodeContent | Node }
};
type columnGroup = {
	title?: string,
	children: columns
};
type columns = (columnGroup | column)[];
type dataConfig = {
	network: true,
	url: string | URL,
	method?: "POST" | "GET",
	dataProcessor?: <P extends boolean>(data: any, paginate: P) => { successed: false } | {
		successed: true,
		data: P extends true ? { total: number, data: any[] } : { data: any[] }
	},
	paginate?: basePaginateConfig & {
		pageSizeParam: string,
		pageParam: string
	}
} | {
	network: false,
	data: any[],
	paginate?: basePaginateConfig
};
type basePaginateConfig = {
	pageSize: number,
	currentPage: number | bigint
};

declare class Table extends EventTarget {
	constructor(element: HTMLElement);
	getNodeCell(node: Node): { row: number, column: string } | null;
	setColumns(data: columns): void;
	setData(data: dataConfig): void;
	jump(page: number): void;
	updateData(appendMode?: boolean): void;
	updateRow(index: number): void;
	/** ⚠ Also remove item from data. */
	removeRow(index: number): any;
}

export default Table;
export { Table };