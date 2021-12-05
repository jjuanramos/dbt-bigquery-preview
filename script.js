const bigquery = require('@google-cloud/bigquery');
const query = 'SELECT revenue_fx_lead_sourcer, lastlogindate FROM ebi-dev-260310.dbt_jramos_transform_warehouse.build_dimemployee where revenue_fx_lead_sourcer is not null and lastlogindate is not null limit 1';

class BigQueryRunner {
    job = null;
    constructor(config) {
        this.config = config;
  
        this.client = new bigquery.BigQuery({
          userAgent: 'dbt-bigquery-preview',
          projectId: 'ebi-dev-260310',
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
    const val = await results.data[0].revenue_fx_lead_sourcer.constructor()
    console.log(val);
})()

function rundbtAndRenderResults(
  uri,
  filePath,
  dbtProjectName,
  bigQueryRunner,
  currentPanel,
  fileWatcher
) {
  const queryResult = await getdbtQueryResults(uri, filePath, dbtProjectName, bigQueryRunner);
  if (queryResult.status === "success") {
    const dataWrapped = new htmlWrapper.HTMLResultsWrapper(queryResult.data).getDataWrapped();
    console.log(dataWrapped);
    vscode.window.showInformationMessage(`${queryResult.info.totalBytesProcessed / 1000000000} GB processed`);
    currentPanel.createOrUpdateDataWrappedPanel(dataWrapped);
    fileWatcher.dispose();
    return;
}