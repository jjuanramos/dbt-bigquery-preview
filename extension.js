const vscode = require('vscode');
const bigquery = require('./src/bigquery');
const resultsPanel = require('./src/resultsPanel');
const fs = require('fs');
const yaml = require('yaml');


let config;
let previousFileWatcher;
const configPrefix = 'dbt-bigquery-preview';
const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;

function activate(context) {
	readConfig();
	let currentPanel = new resultsPanel.ResultsPanel(context.extensionUri);

	// add onDidChangeFile to update dbt project name if it changes
	const dbtProjectName = getDbtProjectName(workspacePath);
	const bigQueryRunner = new bigquery.BigQueryRunner(config);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (!event.affectsConfiguration(configPrefix)) {
				return;
			}

			readConfig();
			bigQueryRunner.setConfig(config);
		})
	);

	const disposable = vscode.commands.registerCommand('dbt-bigquery-preview.preview', async () => {
		try {
			const filePath = vscode.window.activeTextEditor.document.fileName;
			const fileName = getFileName(filePath);
			if (!fileName) {
				vscode.window.showErrorMessage('No file found');
				return;
			}
			const compiledFilePath = getCompiledPath(filePath, dbtProjectName);
			
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

			const terminal = selectTerminal();
			terminal.sendText(`dbt compile -s ${fileName}`);
			terminal.show();

			fileWatcher.onDidChange(async (uri) => {
				await rundbtAndRenderResults(
					uri,
					filePath,
					dbtProjectName,
					bigQueryRunner,
					currentPanel,
					fileWatcher,
					terminal
				);
			});

			fileWatcher.onDidCreate(async (uri) => {
				await rundbtAndRenderResults(
					uri,
					filePath,
					dbtProjectName,
					bigQueryRunner,
					currentPanel,
					fileWatcher,
					terminal
				);
			});

		} catch(e) {
			vscode.window.showErrorMessage(e);
		}
	});

	context.subscriptions.push(disposable);
}

async function rundbtAndRenderResults(
	uri,
	filePath,
	dbtProjectName,
	bigQueryRunner,
	currentPanel,
	fileWatcher,
	terminal
  ) {
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Waiting for BigQuery to run the code...'
	}, async() => {
		try {
			const queryResult = await getdbtQueryResults(uri, filePath, dbtProjectName, bigQueryRunner);
			if (queryResult.status === "success") {
				const totalBytes = queryResult.info.totalBytesProcessed;
				let bytesMessage;
				if (totalBytes / 1073741824 >= 1) {
					bytesMessage = `${totalBytes / 1073741824} GB`;
				} else if (totalBytes / 1048576 >= 1) {
					bytesMessage = `${totalBytes / 1048576} MB`;
				} else {
					bytesMessage = `${totalBytes} bytes`;
				}
				vscode.window.showInformationMessage(`${bytesMessage} processed`);
				currentPanel.createOrUpdateDataWrappedPanel(queryResult.data);
				terminal.hide();
				fileWatcher.dispose();
				return;
			} else {
				fileWatcher.dispose();
				return;			
			}
		} catch (e) {
			fileWatcher.dispose();
			vscode.window.showErrorMessage(e);
		}
	});
  }

function readConfig() {
	try {
		config = vscode.workspace.getConfiguration(configPrefix);
	} catch (e) {
		vscode.window.showErrorMessage(`failed to read config: ${e}`);
	}
}

function getDbtProjectName(workspacePath) {
	try {
		const file = fs.readFileSync(`${workspacePath}/dbt_project.yml`, 'utf-8');
		// assumes the extension is opened in the dbt directory -> Document it
		const parsedFile = yaml.parse(file);
		const dbtProjectName = parsedFile.name;
		return dbtProjectName;
	} catch(e) {
		vscode.window.showErrorMessage("For the extension to work, you must use it in a repository with a dbt_project.yml file");
	}
}


function getFileName(filePath) {
	const lastIndex = filePath.lastIndexOf('/');
	if (lastIndex === -1) {
		vscode.window.showErrorMessage("File not found");
		return;
	} else {
		const fileName = filePath.slice(lastIndex + 1, filePath.length).replace('.sql', '');
		return fileName;
	}
}

function getCompiledPath(filePath, dbtProjectName) {
    const filePathSplitted = filePath.split('/models/');
    const compiledFilePath = `${filePathSplitted[0]}/target/compiled/${dbtProjectName}/models/${filePathSplitted[1]}`;
	return compiledFilePath;
}

function getCompiledQuery(compiledFilePath) {
    const compiledQuery = fs.readFileSync(compiledFilePath, 'utf-8');
	return compiledQuery + ' limit 100';
}

async function getdbtQueryResults(uri, filePath, dbtProjectName, bigQueryRunner) {
	const compiledFilePath = getCompiledPath(filePath, dbtProjectName);
	if (uri.toString().includes(compiledFilePath)) {
		const compiledQuery = getCompiledQuery(compiledFilePath);
		const queryResult = await bigQueryRunner.query(compiledQuery);
		return queryResult;
	}
}

function selectTerminal() {
	let terminalExists = false;
	if((vscode.window).terminals.length === 0) {
		const terminal = vscode.window.createTerminal('dbt-bigquery-preview');
		return terminal;
	}
	const terminals = (vscode.window).terminals;
	const items = terminals.map(t => {
		return {
			label: `${t.name}`,
			terminal: t
		};
	});
	for (const item of items) {
		if (item.label === 'dbt-bigquery-preview') {
			terminalExists = true;
			return item.terminal;
		}
	}
	if (!terminalExists) {
		const terminal = vscode.window.createTerminal('dbt-bigquery-preview');
		return terminal;
	}
}

function deactivate() {
}

module.exports = {
	activate,
	deactivate
}

// to do
// 1. Rewrite to TS & give better structure
// 2. improve error messages
// 3. Write README.md
// 4. cache existing queries