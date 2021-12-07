const bigquery = require('@google-cloud/bigquery');
const query = "select * from northwind-raw.sales_ddbb.Employees";

class BigQueryRunner {
    job = null;
    constructor(config) {
        this.config = config;
  
        this.client = new bigquery.BigQuery({
          userAgent: 'dbt-bigquery-preview',
          projectId: 'northwind-analytics-dev',
          location: 'EU'
        });
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
        throw err;
      }
      this.job = data[0];
  
      if (!this.job) {
        throw new Error("No job was found.");
      }
  
      // vscode.window.showInformationMessage(`BigQuery job ID: ${this.job.metadata.id}`);
  
      let result;
  
      try {
        result = await this.job.getQueryResults({
          autoPaginate: true
        });
      } catch (err) {
        throw err;
      }
  
      try {
        return await this.processResults(result[0]);
      } catch (err) {
        throw err;
      }
    }
  
    async processResults(rows) {
      if (!this.job) {
        throw new Error('No job was found.');
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

const bq = new BigQueryRunner();

(async() => {
    const results = await bq.query(query);
    const val = await results.data[0].my_bignumeric;
    const valueEndsAt = val["e"];
    const valueLength = val["c"].length;
    console.log(`${valueEndsAt}, ${valueLength}`);
    const final = val["c"].slice(0, valueEndsAt + 1).join('') + '.' + val["c"].slice(valueEndsAt + 1).join('');
    console.log(final);
})()
