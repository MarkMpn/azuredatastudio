/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IProgress, IProgressService2, IProgressStep, IProgressOptions } from 'vs/platform/progress/common/progress';
import { MainThreadProgressShape, MainContext, IExtHostContext, ExtHostProgressShape, ExtHostContext } from '../common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workbench/api/electron-browser/extHostCustomers';

@extHostNamedCustomer(MainContext.MainThreadProgress)
export class MainThreadProgress implements MainThreadProgressShape {

	private readonly _progressService: IProgressService2;
	private _progress = new Map<number, { resolve: () => void, progress: IProgress<IProgressStep> }>();
	private readonly _proxy: ExtHostProgressShape;

	constructor(
		extHostContext: IExtHostContext,
		@IProgressService2 progressService: IProgressService2
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostProgress);
		this._progressService = progressService;
	}

	dispose(): void {
		this._progress.forEach(handle => handle.resolve());
		this._progress.clear();
	}

	$startProgress(handle: number, options: IProgressOptions): void {
		const task = this._createTask(handle);

		this._progressService.withProgress(options, task, () => this._proxy.$acceptProgressCanceled(handle));
	}

	$progressReport(handle: number, message: IProgressStep): void {
		const entry = this._progress.get(handle);
		if (entry) {
			entry.progress.report(message);
		}
	}

	$progressEnd(handle: number): void {
		const entry = this._progress.get(handle);
		if (entry) {
			entry.resolve();
			this._progress.delete(handle);
		}
	}

	private _createTask(handle: number) {
		return (progress: IProgress<IProgressStep>) => {
			return new Promise<any>(resolve => {
				this._progress.set(handle, { resolve, progress });
			});
		};
	}
}
