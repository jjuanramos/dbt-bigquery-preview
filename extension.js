const vscode = require('vscode');
const bigquery = require('./src/bigquery');
const htmlWrapper = require('./src/html');
const fs = require('fs');
const yaml = require('yaml');


let config;
const configPrefix = 'dbt-bigquery-preview';
const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;

function activate(context) {
	readConfig();
	const fileWatcher = vscode.workspace.createFileSystemWatcher(
		new vscode.RelativePattern(`${workspacePath}/target/compiled`, '**/*.sql')
	);
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
			const terminal = selectTerminal();
			terminal.sendText(`dbt compile -s ${fileName}`);

			fileWatcher.onDidChange(async (uri) => {
				const queryResult = await getdbtQueryResults(uri, filePath, dbtProjectName, bigQueryRunner);
				if (queryResult.status === "success") {
					const dataWrapped = new htmlWrapper.HTMLResultsWrapper(queryResult.data).getDataWrapped();
					console.log(dataWrapped);
					vscode.window.showInformationMessage(`${queryResult.info.totalBytesProcessed} bytes processed`);
					createWebViewPanel(dataWrapped);
				};
			});

			fileWatcher.onDidCreate(async (uri) => {
				const queryResult = await getdbtQueryResults(uri, filePath, dbtProjectName, bigQueryRunner);
				if (queryResult.status === "success") {
					const dataWrapped = new htmlWrapper.HTMLResultsWrapper(queryResult.data).getDataWrapped();
					console.log(dataWrapped);
					vscode.window.showInformationMessage(`${queryResult.info.totalBytesProcessed} bytes processed`);
					createWebViewPanel(dataWrapped);
				};
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

// TODO
// turn this into a class that:
//is able to be updated if the html already exists
// creates the webbiew in another panel, but splits the screen in two (preferably up and down),
// and showcases the results down
function createWebViewPanel(dataWrapped) {
	const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

	const panel = vscode.window.createWebviewPanel(
		"Preview dbt",
		"Preview dbt",
		column || vscode.ViewColumn.Two,
		{
		  // Enable javascript in the webview
		  enableScripts: true,
		}
	  );

	panel.webview.html = dataWrapped;
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
	return compiledQuery;
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
// 1. Create function that, given a simple input array, returns the wanted html table
// 2. Improve function so it handles nested arrays / objects
// 3. Render function in the screen
// utils
// https://github.dev/tadyjp/vscode-query-runner/src/BigQueryRunner.ts
// https://github.dev/looker-open-source/malloy/packages/malloy-vscode/src/extension/commands/run_query_utils.ts
// https://github.com/benawad/vstodo/blob/master/extension/src/HelloWorldPanel.ts