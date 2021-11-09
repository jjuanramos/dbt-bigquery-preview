const vscode = require('vscode');
const bigquery = require('./src/bigquery');

let config;
const configPrefix = 'dbt-bigquery-preview';

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

	console.log('Congratulations, your extension "dbt-bigquery-preview" is now active!');

	let disposable = vscode.commands.registerCommand('dbt-bigquery-preview.runQuery', async () => {
		try {
			const queryResult = await bigQueryRunner.runBigQueryJob(
				'select * from `northwind-raw.sales_ddbb.Employees`'
			);
			const data = queryResult[0][0].name;
			vscode.window.showInformationMessage(`${data}`);
		} catch(e) {
			vscode.window.showErrorMessage(e);
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

// utils
// https://github.dev/dbt-labs/dbt-bigquery/dbt/adapters/bigquery/connections.py
// https://github.dev/tadyjp/vscode-query-runner/blob/master/src/BigQueryRunner.ts
// https://github.dev/looker-open-source/malloy/packages/malloy-db-bigquery/src/bigquery_connection.ts