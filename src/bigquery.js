const vscode = require('vscode');
const bigquery = require('@google-cloud/bigquery');
const google_auth = require('./google_auth');

export class BigQueryRunner {
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

  async createBigQueryJob(query) {
    const [job] = await this.client.createQueryJob(query);
    return job;
  }

  async runBigQueryJob(query) {
    try {
      const job = await this.createBigQueryJob(query);
      return await job.getQueryResults();
    } catch(e) {
        throw vscode.window.showErrorMessage(`${e}`);
    }
  }
}