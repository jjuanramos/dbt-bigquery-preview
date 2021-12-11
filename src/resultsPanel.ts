import * as vscode from 'vscode';
import * as htmlWrapper  from './html';

export class ResultsPanel {
    _panel: vscode.WebviewPanel | undefined;
    viewType: string;
    title: string;
    _extensionUri: vscode.Uri;
    _disposables: vscode.WebviewPanel[];
    
    constructor(extensionUri) {
        this._panel;
        this._disposables = [];
        this.viewType = "dbt-bigquery-preview";
        this.title = "Preview dbt";
        this._extensionUri = extensionUri;
    }

    createOrUpdateDataHTMLPanel(queryData: string[]) {
        if (this._panel) {
            this._update(queryData);
        } else {
            const panel = vscode.window.createWebviewPanel(
                this.viewType,
                this.title,
                vscode.ViewColumn.Two,
                {
                    enableScripts: true
                }
            )
            this._panel = panel;
            this._update(queryData);
            this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        }

    }

    // add styles.css and scripts.js to update here
    _update(queryData: string[]) {
        const scriptPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'collapsible.js');
        const scriptUri = scriptPath.with({ 'scheme': 'vscode-resource'});

        const stylesPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css');
		const stylesUri = this._panel.webview.asWebviewUri(stylesPath);

        const htmlWithData = new htmlWrapper.HTMLResultsWrapper(queryData).getDataWrapped(scriptUri, stylesUri);
        const htmlWithDataCleanedUp = htmlWithData.replace('null', '');
        this._panel.webview.html = htmlWithDataCleanedUp;
    }

    dispose() {
        // Clean up our resources
        this._panel.dispose();
        this._panel = undefined;
    
        while (this._disposables.length) {
          const x = this._disposables.pop();
          if (x) {
            x.dispose();
          }
        }
      }
}