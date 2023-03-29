import { IObject } from "@daybrush/utils";
import SolidEditor from "../SolidEditor";

export type RestoreCallback = (props: any, editor: SolidEditor) => any;
export interface HistoryAction {
	type: string;
	props: IObject<any>;
}
export default class HistoryManager {
	private undoStack: HistoryAction[] = [];
	private redoStack: HistoryAction[] = [];
	private types: IObject<{ redo: RestoreCallback; undo: RestoreCallback }> = {};
	constructor(private editor: SolidEditor) {}
	public registerType(
		type: string,
		undo: RestoreCallback,
		redo: RestoreCallback
	) {
		this.types[type] = { undo, redo };
	}
	public addAction(type: string, props: IObject<any>) {
		this.editor.console.log(`Add History:`, type, props);
		this.undoStack.push({
			type,
			props,
		});
		this.redoStack = [];
	}
	public undo() {
		const undoAction = this.undoStack.pop();

		if (!undoAction) {
			return;
		}
		this.editor.console.log(
			`Undo History: ${undoAction.type}`,
			undoAction.props
		);
		this.types[undoAction.type].undo(undoAction.props, this.editor);
		this.redoStack.push(undoAction);
	}
	public redo() {
		const redoAction = this.redoStack.pop();

		if (!redoAction) {
			return;
		}
		this.editor.console.log(
			`Redo History: ${redoAction.type}`,
			redoAction.props
		);
		this.types[redoAction.type].redo(redoAction.props, this.editor);
		this.undoStack.push(redoAction);
	}
}