/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IPickerQuickAccessItem, PickerQuickAccessProvider, TriggerAction } from 'vs/platform/quickinput/browser/pickerQuickAccess';
import { CancellationToken } from 'vs/base/common/cancellation';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { ThrottledDelayer } from 'vs/base/common/async';
import { getWorkspaceSymbols, IWorkspaceSymbol, IWorkspaceSymbolProvider } from 'vs/workbench/contrib/search/common/search';
import { SymbolKinds, SymbolTag, SymbolKind } from 'vs/editor/common/modes';
import { ILabelService } from 'vs/platform/label/common/label';
import { Schemas } from 'vs/base/common/network';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { Range } from 'vs/editor/common/core/range';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkbenchEditorConfiguration } from 'vs/workbench/common/editor';
import { IKeyMods } from 'vs/platform/quickinput/common/quickInput';
import { URI } from 'vs/base/common/uri';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { getSelectionSearchString } from 'vs/editor/contrib/find/findController';
import { withNullAsUndefined } from 'vs/base/common/types';
import { prepareQuery, IPreparedQuery, scoreFuzzy2, FuzzyScore2, pieceToQuery } from 'vs/base/common/fuzzyScorer';

interface ISymbolQuickPickItem extends IPickerQuickAccessItem {
	resource: URI | undefined;
	score?: number;
	symbol: IWorkspaceSymbol;
}

export class SymbolsQuickAccessProvider extends PickerQuickAccessProvider<ISymbolQuickPickItem> {

	static PREFIX = '#';

	private static readonly TYPING_SEARCH_DELAY = 200; // this delay accommodates for the user typing a word and then stops typing to start searching

	private static TREAT_AS_GLOBAL_SYMBOL_TYPES = new Set<SymbolKind>([
		SymbolKind.Class,
		SymbolKind.Enum,
		SymbolKind.File,
		SymbolKind.Interface,
		SymbolKind.Namespace,
		SymbolKind.Package,
		SymbolKind.Module
	]);

	private delayer = this._register(new ThrottledDelayer<ISymbolQuickPickItem[]>(SymbolsQuickAccessProvider.TYPING_SEARCH_DELAY));

	get defaultFilterValue(): string | undefined {

		// Prefer the word under the cursor in the active editor as default filter
		const editor = this.codeEditorService.getFocusedCodeEditor();
		if (editor) {
			return withNullAsUndefined(getSelectionSearchString(editor));
		}

		return undefined;
	}

	constructor(
		@ILabelService private readonly labelService: ILabelService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService
	) {
		super(SymbolsQuickAccessProvider.PREFIX, { canAcceptInBackground: true });
	}

	private get configuration() {
		const editorConfig = this.configurationService.getValue<IWorkbenchEditorConfiguration>().workbench.editor;

		return {
			openEditorPinned: !editorConfig.enablePreviewFromQuickOpen,
			openSideBySideDirection: editorConfig.openSideBySideDirection
		};
	}

	protected getPicks(filter: string, disposables: DisposableStore, token: CancellationToken): Promise<Array<ISymbolQuickPickItem>> {
		return this.getSymbolPicks(filter, undefined, token);
	}

	async getSymbolPicks(filter: string, options: { skipLocal?: boolean, skipSorting?: boolean, delay?: number } | undefined, token: CancellationToken): Promise<Array<ISymbolQuickPickItem>> {
		return this.delayer.trigger(async () => {
			if (token.isCancellationRequested) {
				return [];
			}

			return this.doGetSymbolPicks(prepareQuery(filter), options, token);
		}, options?.delay);
	}

	private async doGetSymbolPicks(query: IPreparedQuery, options: { skipLocal?: boolean, skipSorting?: boolean } | undefined, token: CancellationToken): Promise<Array<ISymbolQuickPickItem>> {

		// Split between symbol and container query
		let symbolQuery: IPreparedQuery;
		let containerQuery: IPreparedQuery | undefined;
		if (query.values && query.values.length > 1) {
			symbolQuery = pieceToQuery(query.values[0]); 		  // symbol: only match on first part
			containerQuery = pieceToQuery(query.values.slice(1)); // container: match on all but first parts
		} else {
			symbolQuery = query;
		}

		// Run the workspace symbol query
		const workspaceSymbols = await getWorkspaceSymbols(symbolQuery.original, token);
		if (token.isCancellationRequested) {
			return [];
		}

		const symbolPicks: Array<ISymbolQuickPickItem> = [];

		// Convert to symbol picks and apply filtering
		const openSideBySideDirection = this.configuration.openSideBySideDirection;
		for (const [provider, symbols] of workspaceSymbols) {
			for (const symbol of symbols) {

				// Depending on the workspace symbols filter setting, skip over symbols that:
				// - do not have a container
				// - and are not treated explicitly as global symbols (e.g. classes)
				if (options?.skipLocal && !SymbolsQuickAccessProvider.TREAT_AS_GLOBAL_SYMBOL_TYPES.has(symbol.kind) && !!symbol.containerName) {
					continue;
				}

				const symbolLabel = symbol.name;
				const symbolLabelWithIcon = `$(symbol-${SymbolKinds.toString(symbol.kind) || 'property'}) ${symbolLabel}`;

				// Score by symbol label if searching
				let symbolScore: FuzzyScore2 | undefined;
				if (symbolQuery.original.length > 0) {
					symbolScore = scoreFuzzy2(symbolLabel, symbolQuery, symbolLabelWithIcon.length - symbolLabel.length /* Readjust matches to account for codicons in label */);
					if (!symbolScore) {
						continue;
					}
				}

				const symbolUri = symbol.location.uri;
				let containerLabel: string | undefined = undefined;
				if (symbolUri) {
					const containerPath = this.labelService.getUriLabel(symbolUri, { relative: true });
					if (symbol.containerName) {
						containerLabel = `${symbol.containerName} • ${containerPath}`;
					} else {
						containerLabel = containerPath;
					}
				}

				// Score by container if specified and searching
				let containerScore: FuzzyScore2 | undefined = undefined;
				if (containerQuery && containerQuery.original.length > 0) {
					if (containerLabel) {
						containerScore = scoreFuzzy2(containerLabel, containerQuery);
					}

					if (!containerScore) {
						continue;
					}

					if (symbolScore) {
						symbolScore[0] += containerScore[0]; // boost symbolScore by containerScore
					}
				}

				const deprecated = symbol.tags ? symbol.tags.indexOf(SymbolTag.Deprecated) >= 0 : false;

				symbolPicks.push({
					symbol,
					resource: symbolUri,
					score: symbolScore?.[0],
					label: symbolLabelWithIcon,
					ariaLabel: symbolLabel,
					highlights: deprecated ? undefined : {
						label: symbolScore?.[1],
						description: containerScore?.[1]
					},
					description: containerLabel,
					strikethrough: deprecated,
					buttons: [
						{
							iconClass: openSideBySideDirection === 'right' ? 'codicon-split-horizontal' : 'codicon-split-vertical',
							tooltip: openSideBySideDirection === 'right' ? localize('openToSide', "Open to the Side") : localize('openToBottom', "Open to the Bottom")
						}
					],
					trigger: (buttonIndex, keyMods) => {
						this.openSymbol(provider, symbol, token, { keyMods, forceOpenSideBySide: true });

						return TriggerAction.CLOSE_PICKER;
					},
					accept: async (keyMods, event) => this.openSymbol(provider, symbol, token, { keyMods, preserveFocus: event.inBackground }),
				});
			}
		}

		// Sort picks (unless disabled)
		if (!options?.skipSorting) {
			symbolPicks.sort((symbolA, symbolB) => this.compareSymbols(symbolA, symbolB));
		}

		return symbolPicks;
	}

	private async openSymbol(provider: IWorkspaceSymbolProvider, symbol: IWorkspaceSymbol, token: CancellationToken, options: { keyMods: IKeyMods, forceOpenSideBySide?: boolean, preserveFocus?: boolean }): Promise<void> {

		// Resolve actual symbol to open for providers that can resolve
		let symbolToOpen = symbol;
		if (typeof provider.resolveWorkspaceSymbol === 'function' && !symbol.location.range) {
			symbolToOpen = await provider.resolveWorkspaceSymbol(symbol, token) || symbol;

			if (token.isCancellationRequested) {
				return;
			}
		}

		// Open HTTP(s) links with opener service
		if (symbolToOpen.location.uri.scheme === Schemas.http || symbolToOpen.location.uri.scheme === Schemas.https) {
			await this.openerService.open(symbolToOpen.location.uri, { fromUserGesture: true });
		}

		// Otherwise open as editor
		else {
			await this.editorService.openEditor({
				resource: symbolToOpen.location.uri,
				options: {
					preserveFocus: options?.preserveFocus,
					pinned: options.keyMods.alt || this.configuration.openEditorPinned,
					selection: symbolToOpen.location.range ? Range.collapseToStart(symbolToOpen.location.range) : undefined
				}
			}, options.keyMods.ctrlCmd || options?.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP);
		}
	}

	private compareSymbols(symbolA: ISymbolQuickPickItem, symbolB: ISymbolQuickPickItem): number {

		// By score
		if (symbolA.score && symbolB.score) {
			if (symbolA.score > symbolB.score) {
				return -1;
			} else if (symbolA.score < symbolB.score) {
				return 1;
			}
		}

		// By name
		const symbolAName = symbolA.symbol.name.toLowerCase();
		const symbolBName = symbolB.symbol.name.toLowerCase();
		const res = symbolAName.localeCompare(symbolBName);
		if (res !== 0) {
			return res;
		}

		// By kind
		const symbolAKind = SymbolKinds.toCssClassName(symbolA.symbol.kind);
		const symbolBKind = SymbolKinds.toCssClassName(symbolB.symbol.kind);
		return symbolAKind.localeCompare(symbolBKind);
	}
}
