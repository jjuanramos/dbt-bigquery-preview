// to do
// 1. Test in Windows
// 2. Test if it works without clientId
// 3. Write README.md
// 4. Release!!

import *  as vscode from 'vscode';

import * as bigquery from './src/bigquery';
import * as resultsPanel from './src/resultsPanel';
import * as dbt from './src/dbt';

let config: vscode.WorkspaceConfiguration;
const configPrefix = 'dbt-bigquery-preview';
const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;

function activate(context: vscode.ExtensionContext) {
	readConfig();

	const bigQueryRunner = new bigquery.BigQueryRunner(config);
	const dbtRunner = new dbt.DbtRunner(workspacePath, bigQueryRunner);
	const currentPanel = new resultsPanel.ResultsPanel(context.extensionUri);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (!event.affectsConfiguration(configPrefix)) {
				return;
			}

			readConfig();
			dbtRunner.setConfig(config);
		})
	);

	const disposable = vscode.commands.registerCommand('dbt-bigquery-preview.preview', async () => {
		try {
			const filePath = vscode.window.activeTextEditor.document.fileName;
			const fileName = dbtRunner.getFileName(filePath);

			if (!fileName) {
				vscode.window.showErrorMessage('No file found');
				return;
			}
			
			const fileWatcher = dbtRunner.createFileWatcher();
			dbtRunner.compileDbtAndShowTerminal();

			fileWatcher.onDidChange(async (uri) => {
				await dbtRunner.runDbtAndRenderResults(
					uri,
					currentPanel
				);
			});

			fileWatcher.onDidCreate(async (uri) => {
				await dbtRunner.runDbtAndRenderResults(
					uri,
					currentPanel
				);
			});

		} catch(e) {
			vscode.window.showErrorMessage(e);
		}
	});

	context.subscriptions.push(disposable);
}

function readConfig() {
	try {
		config = vscode.workspace.getConfiguration(configPrefix);
	} catch (e) {
		vscode.window.showErrorMessage(`failed to read config: ${e}`);
	}
}

function deactivate() {
}

module.exports = {
	activate,
	deactivate
}
