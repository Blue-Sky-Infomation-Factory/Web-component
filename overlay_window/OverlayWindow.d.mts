type OverlayWindowOptions = {
	noManualClose?: boolean,
	size?: {
		width?: string,
		height?: string
	},
	style?: OverlayWindowStyleOptions,
	containerClassName?: string
}
type OverlayWindowStyleOptions = {
	backgroundColor?: string,
	textColor?: string,
	interactiveColor?: string,
	interactiveHoverColor?: string,
	interactiveActiveColor?: string,
	interactiveTextColor?: string,
	interactiveHoverTextColor?: string,
	interactiveActiveTextColor?: string
}
type OverlayWindowEventListener = ((this: OverlayWindow, event: Event) => void) | null;
/**
 * Represents a OverlayWindow that can be displayed with various features.
 * @event OverlayWindow#show The OverlayWindow got activated and starting to be shown.
 * @event OverlayWindow#shown The OverlayWindow has been fully shown.
 * @event OverlayWindow#close The OverlayWindow got inactivated and starting to be hidden.
 * @event OverlayWindow#closed The OverlayWindow has been fully hidden.
 */
declare class OverlayWindow extends EventTarget {
	/**
	 * Event listener for the 'show' event.
	 * @listens show
	 */
	onshow: OverlayWindowEventListener;
	/**
	 * Event listener for the 'shown' event.
	 * @listens shown
	 */
	onshown: OverlayWindowEventListener;
	/**
	 * Event listener for the 'close' event.
	 * @listens close
	 */
	onclose: OverlayWindowEventListener;
	/**
	 * Event listener for the 'closed' event.
	 * @listens closed
	 */
	onclosed: OverlayWindowEventListener;
	/** Indicates whether the OverlayWindow is currently active. */
	readonly active: boolean;
	/** Indicates whether the OverlayWindow is closed. */
	readonly closed: boolean;
	/** Indicates whether the OverlayWindow is enable to receive mouse operations. */
	readonly blocked: boolean;
	/**
	 * Creates a new OverlayWindow and queues it up.
	 * @param content The content of the new OverlayWindow.
	 * @param title The title of the new OverlayWindow.
	 * @param options The options for the new OverlayWindow.
	 */
	constructor(content: string | Node, title = "提示", options?: OverlayWindowOptions);
	/**
	 * Enables or disables the ability for the OverlayWindow to receive mouse operations.
	 * @param toState Whether the OverlayWindow can receive mouse operations. By default, toggles the state.
	 * @returns Whether successfully changed the state.
	 */
	blockSwitch(toState?: boolean): boolean;
	/**
	 * Inactivates the OverlayWindow, starts to hide it, or removes it from the queue if not shown yet.
	 * @fires OverlayWindow#close
	 */
	close(): void;
	/**
	 * Creates a new OverlayWindow and queues it for the next displayed OverlayWindow.
	 * @param content The content of the new OverlayWindow.
	 * @param title The title of the new OverlayWindow.
	 * @param options The options for the new OverlayWindow.
	 * @returns The newly created OverlayWindow instance.
	 */
	after(content: string | Node, title = "提示", options?: OverlayWindowOptions): OverlayWindow;
	/**
	 * Shows a sub window with an alert message.
	 * @param message - The message to display in the alert.
	 * @returns A promise that resolves when the alert is confirmed.
	 */
	alert(message: string): Promise<void>;
	/**
	 * Shows a sub window with a confirmation message.
	 * @param message - The message to display in the confirmation dialog.
	 * @returns A promise that resolves to true when the confirmation is accepted, and false when declined.
	 */
	confirm(message: string, textOfYes = "是", textOfNo = "否"): Promise<boolean>;
	/**
	 * Shows a sub window with a loading spinner let the user wating for something.
	 * @param message The tooltip text to display.
	 * @returns A function that stops the waiting process.
	 */
	wait(message: string): () => void;
	/**
	 * Show a sub window with a text input element to receive user input.
	 * @param message The tooltip text to display.
	 * @returns A promise that resolves to the user input.
	 * @throws {DOMException} User clicked the cancel button.
	 */
	prompt(message: string, defaultText?: string): Promise<string>;
	static alert(message: string | Node, title = "提示"): Promise<void>;
	/**
	 * Shows a confirmation dialog with custom content and title.
	 * @static
	 * @param content The content of the confirmation dialog.
	 * @param title The title of the confirmation dialog.
	 * @returns A promise that resolves to true when the confirmation is accepted, and false when declined.
	 */
	static confirm(content: string | Node, title = "确认", textOfYes = "是", textOfNo = "否"): Promise<boolean>;
	static wait(message: string, title = "请等待"): () => void;
	static prompt(message: string, defaultText?: string): Promise<string>;
}
declare function remove(): void;
declare function reload(): void;
declare function setCounterEnabled(enabled: boolean): void;
export default OverlayWindow;
export { OverlayWindow, remove, reload, setCounterEnabled };