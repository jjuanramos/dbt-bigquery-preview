const vscode = require('vscode');

export class ResultsPanel {
    constructor() {
        this._panel;
        this._disposables = [];
        this.viewType = "dbt-bigquery-preview";
        this.title = "Preview dbt";
    }

    createOrUpdateDataWrappedPanel(dataWrapped) {
        // const column = vscode.window.activeTextEditor
        //     ? vscode.window.activeTextEditor.viewColumn
        //     : undefined;

        if (this._panel) {
            this._update(dataWrapped);
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
            this._update(dataWrapped);
            this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        }

    }

    _update(dataWrapped) {
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