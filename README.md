# dbt-bigquery-preview

dbt-bigquery-preview is a little extension that allows you to run [dbt](https://getdbt.com/) code directly against [BigQuery](https://cloud.google.com/bigquery) and get the results back in vscode.

Please let us know about any bugs or feature requests through the github issues.

## Features

// TODO

## Requirements

For dbt-bigquery-preview to work, you have to:
- Be authenticated through the OAuth gcloud setup. dbt Labs have a tutorial on how to do so, link [here](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#local-oauth-gcloud-setup).
- Open vscode in a dbt project.

## Extension Settings

This extension contributes the following settings:

* `dbt-bigquery-preview.projectId`: Set the projectId of the BigQuery project you want to query against.
* `dbt-bigquery-preview.location`: set the location of the data you want to query.

Both of these are mandatory if you want the extension to work. In order to set them up, go to `Settings -> Extensions -> dbt-bigquery-preview`.

## Release Notes

### 0.1.0

Initial release of dbt-bigquery-preview!