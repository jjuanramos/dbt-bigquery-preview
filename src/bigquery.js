const vscode = require('vscode');
const bigquery = require('@google-cloud/bigquery');
const google_auth = require('./google_auth');
const flat = require("flat");

export class BigQueryRunner {
  job = null;
  constructor(config) {
      this.config = config;
      this.googleAuth = new google_auth.GoogleAuth();

      this.client = new bigquery.BigQuery({
        userAgent: 'dbt-bigquery-preview',
        projectId: !!this.config.get("projectId")? this.config.get("projectId") : undefined,
        location: !!this.config.get("location") ? this.config.get("location") : undefined
      });
  }

  setConfig(config) {
    this.config = config;
  }

  getAuthorizeUrl() {
    return this.googleAuth.getAuthorizeUrl();
  }

  async setRefreshClient(authCode) {
    const refreshClient = await this.googleAuth.setRefreshClient(authCode);
    this.client.authClient.cachedCredential = refreshClient;
  }

  async query(queryText, isDryRun) {
    let data;
    try {
      data = await this.client.createQueryJob({
        query: queryText,
        // location: config.get("location"),
        // maximumBytesBilled: config.get("maximumBytesBilled"),
        // useLegacySql: config.get("useLegacySql"),
        dryRun: !!isDryRun
      });
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to query BigQuery: ${err}`);
      return;
    }
    this.job = data[0];

    if (!this.job) {
      vscode.window.showErrorMessage(`No job was found`);
      return;
    }

    // vscode.window.showInformationMessage(`BigQuery job ID: ${this.job.metadata.id}`);

    let result;

    try {
      result = await this.job.getQueryResults({
        autoPaginate: true
      });
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to query BigQuery: ${err}`);
      return;
    }

    try {
      return await this.processResults(result[0]);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to get results: ${err}`);
      return;
    }
  }

  async processResults(rows) {
    if (!this.job) {
      vscode.window.showErrorMessage(`No job was found`);
      return;
    }

    const metadata = (await this.job.getMetadata())[0];

    return {
      status: "success",
      info: {
        projectId: metadata.jobReference.projectId,
        jobId: metadata.id,
        location: this.job.location,
        jobLink: metadata.selfLink,
        creationTime: metadata.statistics.creationTime,
        startTime: metadata.statistics.startTime,
        endTime: metadata.statistics.endTime,
        userEmail: metadata.user_email,
        totalBytesProcessed: metadata.statistics.totalBytesProcessed,
        status: metadata.status.state,
      },
      data: rows,
      detail: JSON.stringify(metadata.statistics, null, "  "),
    };
  }
}