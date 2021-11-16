const vscode = require('vscode');
const bigquery = require('./src/bigquery');
const fs = require('fs');
const yaml = require('yaml');


let config;
const configPrefix = 'dbt-bigquery-preview';

// assumes the extension is opened in the dbt directory -> Document it
const wpFolders = vscode.workspace.workspaceFolders;
const workspacePath = wpFolders[0].uri.path;
const file = fs.readFileSync(`${workspacePath}/dbt_project.yml`, 'utf-8');
const parsedFile = yaml.parse(file);
const projectName = parsedFile.name;

const fileWatcher = vscode.workspace.createFileSystemWatcher(
	new vscode.RelativePattern(`${workspacePath}/target/compiled`, '**/*.sql')
);

function activate(context) {
	readConfig();
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const bigQueryRunner = new bigquery.BigQueryRunner(config, editor);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (!event.affectsConfiguration(configPrefix)) {
				return;
			}

			readConfig();
			bigQueryRunner.setConfig(config);
		})
	);

	const disposable = vscode.commands.registerCommand('dbt-bigquery-preview.runQuery', async () => {
		try {
			const filePath = vscode.window.activeTextEditor.document.fileName;
			const fileName = getFileName(filePath);
			const terminal = selectTerminal();
			terminal.sendText(`dbt compile -s ${fileName}`);

			fileWatcher.onDidChange(async (uri) => {
				const compiledFilePath = getCompiledPath(filePath);
				if (uri.toString().includes(compiledFilePath)) {
					const compiledQuery = getCompiledQuery(compiledFilePath);
					const queryResult = await bigQueryRunner.runBigQueryJob(compiledQuery);
					const data = queryResult[0][0].name;
					vscode.window.showInformationMessage(`${data}`);
				}
			});

			fileWatcher.onDidCreate(async (uri) => {
				const compiledFilePath = getCompiledPath(filePath);
				if (uri.toString().includes(compiledFilePath)) {
					const compiledQuery = getCompiledQuery(compiledFilePath);
					const queryResult = await bigQueryRunner.runBigQueryJob(compiledQuery);
					const data = queryResult[0][0].name;
					vscode.window.showInformationMessage(`${data}`);
				}
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

function getFileName(filePath) {
	const lastIndex = filePath.lastIndexOf('/');
	if (lastIndex === -1) {
		vscode.window.showErrorMessage("File not found");
	} else {
		const fileName = filePath.slice(lastIndex + 1, filePath.length).replace('.sql', '');
		return fileName;
	}
}

function getCompiledPath(filePath) {
    const filePathSplitted = filePath.split('/models/');
    const compiledFilePath = `${filePathSplitted[0]}/target/compiled/${projectName}/models/${filePathSplitted[1]}`;
	return compiledFilePath;
}

function getCompiledQuery(compiledFilePath) {
    const compiledQuery = fs.readFileSync(compiledFilePath, 'utf-8');
	return compiledQuery;
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
	fileWatcher.dispose();
}

module.exports = {
	activate,
	deactivate
}

// to do
// show result in different window
// utils
// https://github.dev/looker-open-source/malloy/packages/malloy-db-bigquery/src/bigquery_connection.ts