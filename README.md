# dbt-bigquery-preview [UNMAINTAINED]

dbt-bigquery-preview is a little extension that allows you to run [dbt](https://getdbt.com/) code directly against [BigQuery](https://cloud.google.com/bigquery) and get the results back in vscode.

Please let us know about any bugs or feature requests through [GitHub Issues](https://github.com/jjuanramos/dbt-bigquery-preview/issues/new).

## Features

Go to the Command Palette (shortcut: Ctrl + Shift + P) and look for `dbt-bigquery-preview: Preview dbt results`. Click there and... wait for your results!

![Example showcasing the extension](./media/preview.gif)

## Requirements

For dbt-bigquery-preview to work, you have to:
- Be authenticated through the OAuth gcloud setup. If you haven't done so already, dbt Labs have a good tutorial [here](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#local-oauth-gcloud-setup).
- Open vscode in a dbt project.
- dbt>=0.21.0.

## Extension Settings

This extension contributes the following settings:

* `dbt-bigquery-preview.projectId`: Sets the projectId of the BigQuery project you want to query against.
* `dbt-bigquery-preview.location`: Sets the location of the data you want to query. EU by default.
* `dbt-bigquery-preview.executablePath`: Sets the path to the dbt executable. Particularly useful for those who use dbt within a Python virtual environment.

In order to set them up, go to `Settings -> Extensions -> dbt-bigquery-preview`.
