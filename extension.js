const vscode = require('vscode');
const bigquery = require('./src/bigquery');
const fs = require('fs');
const yaml = require('yaml');

let config;
const configPrefix = 'dbt-bigquery-preview';

// assumes the extension is opened in the dbt directory -> Document it
const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;
const file = fs.readFileSync(`${workspacePath}/dbt_project.yml`, 'utf-8');
const parsedFile = yaml.parse(file);
const projectName = parsedFile.name;

function readConfig() {
	try {
		config = vscode.workspace.getConfiguration(configPrefix);
	} catch (e) {
		vscode.window.showErrorMessage(`failed to read config: ${e}`);
	}
}

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
			const compiledQuery = getCompiledQuery(filePath);
			const queryResult = await bigQueryRunner.runBigQueryJob(compiledQuery);
			const data = queryResult[0][0].name;
			vscode.window.showInformationMessage(`${data}`);
		} catch(e) {
			vscode.window.showErrorMessage(e);
		}
	});

	context.subscriptions.push(disposable);
}

function getCompiledQuery(filePath) {
    const filePathSplitted = filePath.split('/models/');
    const compiledFilePath = `${filePathSplitted[0]}/target/compiled/${projectName}/models/${filePathSplitted[1]}`;
    const compiledQuery = fs.readFileSync(compiledFilePath, 'utf-8');
	return compiledQuery;
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}

// to do
// DONE 1. manage to get the path to the model in /compile
// /home/juan/coding/learn/dbt/dbt-northwind-analytics/models/staging/stg_customers.sql to
// /home/juan/coding/learn/dbt/dbt-northwind-analytics/target/compiled/northwind/models/staging/stg_customers.sql
	// 1.1 get full path
	// detect where /models start
	// add /target/compiled/$dbt_project.name before the /models
// 2. manage to do dbt compile of the model
// 3. glue 1 & 2 together

// utils
// https://github.dev/dbt-labs/dbt-bigquery/dbt/adapters/bigquery/connections.py
// https://github.dev/tadyjp/vscode-query-runner/blob/master/src/BigQueryRunner.ts
// https://github.dev/looker-open-source/malloy/packages/malloy-db-bigquery/src/bigquery_connection.ts
// https://github.dev/innoverio/vscode-dbt-power-user