import * as google_auth from "./google_auth";
import * as vscode from 'vscode';
import * as bigquery from '@google-cloud/bigquery';

export interface QueryResult {
  status: "success";
  info: { [s: string]: any };
  data: string[];
  detail: string;
}

export class BigQueryRunner {
  job: bigquery.Job;
  config: vscode.WorkspaceConfiguration;
  googleAuth: google_auth.GoogleAuth;
  client: bigquery.BigQuery;

  constructor(config) {
      this.config = config;
      this.googleAuth = new google_auth.GoogleAuth();

      this.client = new bigquery.BigQuery({
        userAgent: 'dbt-bigquery-preview',
        projectId: !!this.config.get("projectId")? this.config.get("projectId") : undefined,
        location: !!this.config.get("location") ? this.config.get("location") : undefined
      });
  }

  setConfig(config: vscode.WorkspaceConfiguration) {
    this.config = config;
  }

  getAuthorizeUrl(): string {
    return this.googleAuth.getAuthorizeUrl();
  }

  async setRefreshClient(authCode: string) {
    const refreshClient = await this.googleAuth.setRefreshClient(authCode);
    this.client.authClient.cachedCredential = refreshClient;
  }

  async query(queryText: string, isDryRun?: boolean): Promise<QueryResult> {
    let data: bigquery.JobResponse;
    try {
      data = await this.client.createQueryJob({
        query: queryText,
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

    let result: bigquery.QueryRowsResponse;
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

  async processResults(rows: Array<any>): Promise<QueryResult> {
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