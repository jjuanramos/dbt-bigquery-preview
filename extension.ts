import *  as vscode from 'vscode';

import * as bigquery from './src/bigquery';
import * as resultsPanel from './src/resultsPanel';
import * as dbt from './src/dbt';

let config: vscode.WorkspaceConfiguration;
let previousFileWatcher: vscode.FileSystemWatcher;
const configPrefix = 'dbt-bigquery-preview';
const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;

function activate(context) {
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
			const compiledFilePath = dbtRunner.getCompiledPath();
			
			// the reason we do this is because we are unable to track the
			// state of the terminal. So, if dbt compile fails we are left
			// with a dangling fileWatcher.
			if (previousFileWatcher) {
				previousFileWatcher.dispose();
			}
			const fileWatcher = vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(
					`${compiledFilePath.slice(0, compiledFilePath.lastIndexOf('/'))}`,
					'**/*.sql'
				)
			);
			previousFileWatcher = fileWatcher;

			dbtRunner.compileDbtAndShowTerminal();

			fileWatcher.onDidChange(async (uri) => {
				await dbtRunner.runDbtAndRenderResults(
					uri,
					currentPanel,
					fileWatcher
				);
			});

			fileWatcher.onDidCreate(async (uri) => {
				await dbtRunner.runDbtAndRenderResults(
					uri,
					currentPanel,
					fileWatcher
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

// to do
// 1. make it work for analyses
// 1. replace null with ''
// 1. Roundup bytes message
// 1. Rewrite to TS with wished architecture in mind. Next goes BQ.js
// 2. improve error messages
// 3. Write README.md
// 4. Add tests
// 5. cache existing queries