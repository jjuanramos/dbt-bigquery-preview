import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'yaml';

import * as resultsPanel from './resultsPanel';
import * as bigquery from './bigquery';

export class DbtRunner {
    dbtProjectName: string;
    bigQueryRunner: bigquery.BigQueryRunner;
    filePath: string | undefined;
    fileName: string | undefined;
    terminal: vscode.Terminal;
    compiledFilePath: string | undefined;

    constructor(workspacePath: string, bigQueryRunner: bigquery.BigQueryRunner) {
        this.dbtProjectName = this.getDbtProjectName(workspacePath);
        this.bigQueryRunner = bigQueryRunner;
    }

    setConfig(config: vscode.WorkspaceConfiguration) {
        this.bigQueryRunner.setConfig(config);
    }

    getDbtProjectName(workspacePath: string): string {
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

    getFileName(filePath: string): string {
        const lastIndex = filePath.lastIndexOf('/');
        if (lastIndex === -1) {
            vscode.window.showErrorMessage("File not found");
            return;
        } else {
            const fileName = filePath.slice(lastIndex + 1, filePath.length).replace('.sql', '');
            this.filePath = filePath;
            this.fileName = fileName;
            return fileName;
        }
    }

    getCompiledPath(): string {
        let dbtKind: string | undefined;
        let filePathSplitted: string[] | string | undefined;
        if (this.filePath.split('/models/').length > 1) {
            filePathSplitted = this.filePath.split('/models/');
            dbtKind = 'models';
        } else if (this.filePath.split('/analysis/').length > 1) {
            filePathSplitted = this.filePath.split('/analysis/');
            dbtKind = 'analysis';
        } else {
            throw 'Compiled Path not found. Try again for a model or analysis.';
        }
        const compiledFilePath = `${filePathSplitted[0]}/target/compiled/${this.dbtProjectName}/${dbtKind}/${filePathSplitted[1]}`;
        this.compiledFilePath = compiledFilePath;
        return compiledFilePath;
    }

    getCompiledQuery(): string {
        const compiledQuery = fs.readFileSync(this.compiledFilePath, 'utf-8');
        return compiledQuery + ' limit 100';
    }

    selectTerminal(): vscode.Terminal {
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

    compileDbtAndShowTerminal() {
        const terminal = this.selectTerminal();
        this.terminal = terminal;

        terminal.sendText(`dbt compile -s ${this.fileName}`);
        terminal.show();
    }

    async getDbtQueryResults(uri: vscode.Uri): Promise<bigquery.QueryResult> {
        const compiledFilePath = this.getCompiledPath();
        if (uri.toString().includes(compiledFilePath)) {
            const compiledQuery = this.getCompiledQuery();
            const queryResult = await this.bigQueryRunner.query(compiledQuery);
            return queryResult;
        }
    }

    async runDbtAndRenderResults(uri: vscode.Uri, currentPanel: resultsPanel.ResultsPanel, fileWatcher: vscode.FileSystemWatcher) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: true,
            title: 'Waiting for BigQuery to run the code...'
        }, async() => {
            try {
                const queryResult = await this.getDbtQueryResults(uri);
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
                    currentPanel.createOrUpdateDataHTMLPanel(queryResult.data);
                    this.terminal.hide();
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
}