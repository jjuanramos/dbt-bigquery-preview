const vscode = require('vscode');
const htmlWrapper = require('./html.js');

export class ResultsPanel {
    constructor() {
        this._panel;
        this._disposables = [];
        this.viewType = "dbt-bigquery-preview";
        this.title = "Preview dbt";
    }

    createOrUpdateDataWrappedPanel(queryData) {
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
    _update(queryData) {
        const dataWrapped = new htmlWrapper.HTMLResultsWrapper(queryData).getDataWrapped();
        this._panel.webview.html = dataWrapped;
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