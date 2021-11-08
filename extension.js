const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dbt-bigquery-preview" is now active!');

	let disposable = vscode.commands.registerCommand('dbt-bigquery-preview.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from dbt-bigquery-preview!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}


// to do
// 1. add config options for the extension
// 2. authenticate
// 3. be able to fetch the project for the given job
// 4. be able to get results back from hardcoded query

// utils
// https://github.dev/dbt-labs/dbt-bigquery/dbt/adapters/bigquery/connections.py
// https://github.dev/tadyjp/vscode-query-runner/blob/master/src/BigQueryRunner.ts
// https://github.dev/looker-open-source/malloy/packages/malloy-db-bigquery/src/bigquery_connection.ts