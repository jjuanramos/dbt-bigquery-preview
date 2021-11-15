const vscode = require('vscode');
const bigquery = require('./src/bigquery');
const fs = require('fs');
const yaml = require('yaml');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


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
			const fileName = getFileName(filePath);
			const terminal = selectTerminal();
			terminal.sendText(`dbt compile -s ${fileName}`);
			console.log(`${terminal.exitStatus.code}`);
			await terminalResponse(terminal);
			vscode.window.showInformationMessage("We awaited!");
			await new Promise(resolve => setTimeout(resolve, 25000));
			console.log(`${terminal.exitStatus.code}`);
			terminal.dispose();
			// const { stdout, stderr } = await executeCommand(cmd);
			// console.log(`stderr: ${stderr}`);
			// console.log(`stdout: ${stdout}`);
			// vscode.window.showInformationMessage(`${stdout}`);
			// const compiledQuery = getCompiledQuery(filePath);
			// const queryResult = await bigQueryRunner.runBigQueryJob(compiledQuery);
			// const data = queryResult[0][0].name;
			// vscode.window.showInformationMessage(`${data}`);
		} catch(e) {
			vscode.window.showErrorMessage(e);
		}
	});

	context.subscriptions.push(disposable);
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

// awaits for the command to end. Retries every 0.25 seconds.
async function terminalResponse(terminal) {
	let counter = 1;
	while (terminal.exitStatus.code !== 0) {
		console.log(`${terminal.exitStatus.code}`);
		console.log(`waiting...${counter}`);
		counter++;
		await new Promise(resolve => setTimeout(resolve, 250));
	}
}

function getCompiledQuery(filePath) {
    const filePathSplitted = filePath.split('/models/');
    const compiledFilePath = `${filePathSplitted[0]}/target/compiled/${projectName}/models/${filePathSplitted[1]}`;
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

function deactivate() {}

module.exports = {
	activate,
	deactivate
}

// to do
// /home/juan/coding/learn/dbt/dbt-northwind-analytics/models/staging/stg_customers.sql to
// /home/juan/coding/learn/dbt/dbt-northwind-analytics/target/compiled/northwind/models/staging/stg_customers.sql
	// 1.1 get full path
	// detect where /models start
	// add /target/compiled/$dbt_project.name before the /models
// 2. manage to do dbt compile of the model, show it in the cmd
// Check how to get current workspace, so we can run dbt in the workspace where vscode is opened
// 3. glue 1 & 2 together

// utils
// https://github.dev/dbt-labs/dbt-bigquery/dbt/adapters/bigquery/connections.py
// https://github.dev/tadyjp/vscode-query-runner/blob/master/src/BigQueryRunner.ts
// https://github.dev/looker-open-source/malloy/packages/malloy-db-bigquery/src/bigquery_connection.ts
// https://github.dev/innoverio/vscode-dbt-power-user
// https://github.dev/innoverio/vscode-dbt-power-user/src/commandProcessExecution.ts
// https://github.dev/innoverio/vscode-dbt-power-user/src/dbt_client/dbtCommandQueue.ts
// https://github.dev/innoverio/vscode-dbt-power-user/src/dbt_client/dbtCommandFactory.ts