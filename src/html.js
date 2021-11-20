// query used
// with my_table as (
//     select 
//         1000 as id,
//         'Juanito Bananas' as name,
//         null as hobbies,
//         ['Diego', 'Wolo'] as pets
//     union all

//     select 
//         1001 as id,
//         'Faloria Rangel' as name,
//             [
//                 struct(
//                 'arepas' as name,
//                 'food' as type
//                 ),
//                 struct(
//                 'c.tangana' as name,
//                 'music' as type
//                 )
//             ] as hobbies,
//         ['Milu', 'Campi', 'Lilo'] as pets
// )

// select * from my_table



const bigquery = require('@google-cloud/bigquery');
const flat = require("flat");

class simplifiedBigQueryRunner {
    job = null;
    constructor() {
  
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
            table: this.makeTable(rows),
            data: rows,
            json: JSON.stringify(rows, null, "  "),
            detail: JSON.stringify(metadata.statistics, null, "  "),
        };
        }

        makeTable(rows) {
        const headers = [];
        Object.keys(flat.flatten(rows[0], { safe: true })).forEach(name => headers.push(name));

        let table = [];

        rows.forEach((val, idx) => {
            // Flatten each row, and for each header (name), insert the matching
            // object property (v[name])
            let v = flat.flatten(val, { safe: true });
            let tableRow= [];
            headers.forEach((name, col) => {
            tableRow.push(v[name]);
            });
            table.push(tableRow);
        });

        return {
            headers,
            rows: table
        };
        }
}

const bigQueryRunner = new simplifiedBigQueryRunner();
const queryText = 'select * from `northwind-raw.sales_ddbb.Employees`';

let results = (async() => {
    const data = await bigQueryRunner.query(queryText);
    console.log(data.data);
    return data;
})();


// const data = [ [ { id: 1000, name: 'Juanito bananas' } ] ];

