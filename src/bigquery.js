import * as vscode from "vscode";
import { BigQuery } from "@google-cloud/bigquery";
import {GoogleAuth} from "./google_auth";

export class BigQueryRunner {
  constructor(config, editor) {
      this.config = config;
      this.editor = editor;
      this.googleAuth = new GoogleAuth();

      this.client = new BigQuery({
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