/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./cellToolbar';
import * as DOM from 'vs/base/browser/dom';
import { Component, Inject, ViewChild, ElementRef, Input } from '@angular/core';
import { localize } from 'vs/nls';
import { Taskbar, ITaskbarContent } from 'sql/base/browser/ui/taskbar/taskbar';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { DeleteCellAction, EditCellAction, CellToggleMoreActions, MoveCellAction, SplitCellAction } from 'sql/workbench/contrib/notebook/browser/cellToolbarActions';
import { AddCellAction } from 'sql/workbench/contrib/notebook/browser/notebookActions';
import { CellTypes } from 'sql/workbench/services/notebook/common/contracts';
import { DropdownMenuActionViewItem } from 'sql/base/browser/ui/buttonMenu/buttonMenu';
import { ICellModel } from 'sql/workbench/services/notebook/browser/models/modelInterfaces';
import { NotebookModel } from 'sql/workbench/services/notebook/browser/models/notebookModel';
import { CellContext } from 'sql/workbench/contrib/notebook/browser/cellViews/codeActions';
import { DisposableStore, IDisposable } from 'vs/base/common/lifecycle';

export const CELL_TOOLBAR_SELECTOR: string = 'cell-toolbar-component';

@Component({
	selector: CELL_TOOLBAR_SELECTOR,
	template: `<div #celltoolbar></div>`
})
export class CellToolbarComponent {
	@ViewChild('celltoolbar', { read: ElementRef }) private celltoolbar: ElementRef;

	public buttonAdd = localize('buttonAdd', "Add cell");
	public optionCodeCell = localize('optionCodeCell', "Code cell");
	public optionTextCell = localize('optionTextCell', "Text cell");
	public buttonMoveDown = localize('buttonMoveDown', "Move cell down");
	public buttonMoveUp = localize('buttonMoveUp', "Move cell up");
	public buttonDelete = localize('buttonDelete', "Delete");
	public buttonSplitCell = localize('splitCell', "Split cell");

	@Input() cellModel: ICellModel;
	@Input() model: NotebookModel;

	private _actionBar: Taskbar;
	private _disposableActions: DisposableStore;
	private _editCellAction: EditCellAction;
	private _cellContext: CellContext;
	private _typeChangedListener: IDisposable;
	public _cellToggleMoreActions: CellToggleMoreActions;

	constructor(
		@Inject(IInstantiationService) private instantiationService: IInstantiationService,
		@Inject(IContextMenuService) private contextMenuService: IContextMenuService
	) {
		this._cellToggleMoreActions = this.instantiationService.createInstance(CellToggleMoreActions);
		this._disposableActions = new DisposableStore();
	}

	ngOnInit() {
		this.initActionBar();
		this._typeChangedListener = this.model.onCellTypeChanged(cell => {
			if (cell === this.cellModel) {
				this.setupActions();
			}
		});
	}

	ngOnDestroy() {
		this._typeChangedListener.dispose();
	}

	protected initActionBar(): void {
		this._cellContext = new CellContext(this.model, this.cellModel);
		let taskbar = <HTMLElement>this.celltoolbar.nativeElement;
		this._actionBar = new Taskbar(taskbar);
		this._actionBar.context = this._cellContext;

		this.setupActions();
	}

	private setupActions(): void {
		this._disposableActions.clear();

		let addCellsButton = this.instantiationService.createInstance(AddCellAction, 'notebook.AddCodeCell', localize('codeCellsPreview', "Add cell"), 'masked-pseudo code');
		this._disposableActions.add(addCellsButton);

		let addCodeCellButton = this.instantiationService.createInstance(AddCellAction, 'notebook.AddCodeCell', localize('codePreview', "Code cell"), 'masked-pseudo code');
		addCodeCellButton.cellType = CellTypes.Code;
		this._disposableActions.add(addCodeCellButton);

		let addTextCellButton = this.instantiationService.createInstance(AddCellAction, 'notebook.AddTextCell', localize('textPreview', "Text cell"), 'masked-pseudo markdown');
		addTextCellButton.cellType = CellTypes.Markdown;
		this._disposableActions.add(addTextCellButton);

		let moveCellDownButton = this.instantiationService.createInstance(MoveCellAction, 'notebook.MoveCellDown', 'masked-icon move-down', this.buttonMoveDown);
		let moveCellUpButton = this.instantiationService.createInstance(MoveCellAction, 'notebook.MoveCellUp', 'masked-icon move-up', this.buttonMoveUp);
		this._disposableActions.add(moveCellDownButton);
		this._disposableActions.add(moveCellUpButton);

		let splitCellButton = this.instantiationService.createInstance(SplitCellAction, 'notebook.SplitCellAtCursor', this.buttonSplitCell, 'masked-icon icon-split-cell');
		splitCellButton.setListener(this._cellContext);
		splitCellButton.enabled = this.cellModel.cellType !== 'markdown';
		this._disposableActions.add(splitCellButton);

		let deleteButton = this.instantiationService.createInstance(DeleteCellAction, 'notebook.DeleteCell', 'masked-icon delete', this.buttonDelete);
		this._disposableActions.add(deleteButton);

		let moreActionsContainer = DOM.$('li.action-item');
		this._cellToggleMoreActions = this.instantiationService.createInstance(CellToggleMoreActions);
		this._cellToggleMoreActions.onInit(moreActionsContainer, this._cellContext);

		this._editCellAction = this.instantiationService.createInstance(EditCellAction, 'notebook.EditCell', true, this.cellModel.isEditMode);
		this._editCellAction.enabled = true;
		this._disposableActions.add(this._editCellAction);

		let addCellDropdownContainer = DOM.$('li.action-item');
		addCellDropdownContainer.setAttribute('role', 'presentation');
		let dropdownMenuActionViewItem = new DropdownMenuActionViewItem(
			addCellsButton,
			[addCodeCellButton, addTextCellButton],
			this.contextMenuService,
			undefined,
			this._actionBar.actionRunner,
			undefined,
			'codicon masked-icon new',
			'',
			undefined
		);
		dropdownMenuActionViewItem.render(addCellDropdownContainer);
		dropdownMenuActionViewItem.setActionContext(this._cellContext);

		let taskbarContent: ITaskbarContent[] = [];
		if (this.cellModel.cellType === CellTypes.Markdown) {
			taskbarContent.push(
				{ action: this._editCellAction }
			);
		}
		taskbarContent.push(
			{ element: addCellDropdownContainer },
			{ action: moveCellDownButton },
			{ action: moveCellUpButton },
			{ action: splitCellButton },
			{ action: deleteButton },
			{ element: moreActionsContainer });

		this._actionBar.setContent(taskbarContent);
	}

	public getEditCellAction(): EditCellAction {
		return this._editCellAction;
	}
}
