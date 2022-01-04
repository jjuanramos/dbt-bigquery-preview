import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';

import * as resultsPanel from './resultsPanel';
import * as bigquery from './bigquery';

export class DbtRunner {
    dbtProjectName: string;
    bigQueryRunner: bigquery.BigQueryRunner;
    filePath: string | undefined;
    fileName: string | undefined;
    terminal: vscode.Terminal;
    compiledFilePath: string | undefined;
    dbtFileWatcher: vscode.FileSystemWatcher;

    constructor(workspacePath: string, bigQueryRunner: bigquery.BigQueryRunner) {
        this.dbtProjectName = this.getDbtProjectName(workspacePath);
        this.bigQueryRunner = bigQueryRunner;
    }

    setConfig(config: vscode.WorkspaceConfiguration) {
        this.bigQueryRunner.setConfig(config);
    }

    getDbtProjectName(workspacePath: string): string {
        try {
            const resolvedPath = path.resolve(workspacePath, 'dbt_project.yml');
            const file = fs.readFileSync(resolvedPath, 'utf-8');
            const parsedFile = yaml.parse(file);
            const dbtProjectName = parsedFile.name;
            return dbtProjectName;
        } catch(e) {
            vscode.window.showErrorMessage(`Error obtaining the dbt project name: ${e}`);
        }
    }

    getFileName(filePath: string): string | undefined {
        try{
            const filePathParsed = path.parse(filePath);
            const fileName = filePathParsed.name;
            this.filePath = filePath;
            this.fileName = fileName;
            return fileName;
        } catch(e) {
            vscode.window.showErrorMessage(`Error obtaining the file name: ${e}`);
        }
    }

    getCompiledPath() {
        let dbtKind: string | undefined;
        let filePathSplitted: string[] | string | undefined;
        if (this.filePath.includes('models')) {
            filePathSplitted = this.filePath.split(`${path.sep}models${path.sep}`);
            dbtKind = 'models';
        } else if (this.filePath.includes('analysis')) {
            filePathSplitted = this.filePath.split(`${path.sep}analysis${path.sep}`);
            dbtKind = 'analysis';
        } else {
            throw 'Compiled Path not found. Try again for a model or analysis.';
        }
        const compiledFilePath = path.join(
            filePathSplitted[0],
            'target',
            'compiled',
            this.dbtProjectName,
            dbtKind,
            filePathSplitted[1]
        );
        this.compiledFilePath = compiledFilePath;
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
        this.terminal = this.selectTerminal();
        this.terminal.sendText(`dbt compile -s ${this.fileName}`);
        this.terminal.show();
    }

    createFileWatcher(): vscode.FileSystemWatcher {
        // If dbt compile fails we are left with a dangling fileWatcher.
        // So, we have to make sure to dispose of any fileWatcher left.
        if (this.dbtFileWatcher) {
            this.dbtFileWatcher.dispose();
        }
        this.getCompiledPath();
        const fileSystemPath = this.compiledFilePath.slice(0, this.compiledFilePath.lastIndexOf(path.sep));
        this.dbtFileWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(
                `${fileSystemPath}`,
                '**/*.sql'
            )
        );
        return this.dbtFileWatcher;
    }

    async getDbtQueryResults(uri: vscode.Uri): Promise<bigquery.QueryResult> {
        if (uri.toString().includes(this.compiledFilePath)) {
            const compiledQuery = this.getCompiledQuery();
            const queryResult = await this.bigQueryRunner.query(compiledQuery);
            return queryResult;
        }
    }

    async runDbtAndRenderResults(uri: vscode.Uri, currentPanel: resultsPanel.ResultsPanel) {
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
                        bytesMessage = `${Math.round(totalBytes / 1073741824)} GB`;
                    } else if (totalBytes / 1048576 >= 1) {
                        bytesMessage = `${Math.round(totalBytes / 1048576)} MB`;
                    } else {
                        bytesMessage = `${Math.round(totalBytes)} bytes`;
                    }
                    vscode.window.showInformationMessage(`${bytesMessage} processed`);
                    currentPanel.createOrUpdateDataHTMLPanel(queryResult.data);
                    this.terminal.hide();
                    this.dbtFileWatcher.dispose();
                    return;
                } else {
                    this.dbtFileWatcher.dispose();
                    return;			
                }
            } catch (e) {
                this.dbtFileWatcher.dispose();
                vscode.window.showErrorMessage(e);
            }
        });
    }
}