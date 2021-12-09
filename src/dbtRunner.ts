import * as vscode from 'vscode';

import * as resultsPanel from './resultsPanel';
import * as bigquery from './bigquery';

export class dbtRunner {
    dbtProjectName: string
    bigQueryRunner: bigquery.BigQueryRunner
    filePath: string | undefined
    fileName: string | undefined
    terminal: vscode.Terminal

    constructor(workspacePath: string, bigQueryRunner: bigquery.BigQueryRunner) {
        this.dbtProjectName = this.getDbtProjectName(workspacePath);
        this.bigQueryRunner = bigQueryRunner;
    }

    getDbtProjectName(workspacePath: string): string {}
    getFileName(filePath: string): string {}
    getCompiledPath(): string {}
    selectTerminal(): vscode.Terminal {}
    compileDbtAndShowTerminal() {}
    async runDbtAndRenderResults(uri: vscode.Uri, currentPanel: resultsPanel.ResultsPanel, fileWatcher: vscode.FileSystemWatcher) {}


}