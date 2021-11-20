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


const data = [
    {
      "id": 1000,
      "name": "Juanito Bananas",
      "hobbies": [],
      "pets": [
        "Diego",
        "Wolo"
      ],
      "time_they_were_killed": {
        "value": "2021-11-20T15:26:59.364Z"
      }
    },
    {
      "id": 1001,
      "name": "Faloria Rangel",
      "hobbies": [
        {
          "name": "arepas",
          "type": "food"
        },
        {
          "name": "c.tangana",
          "type": "music"
        }
      ],
      "pets": [
        "Milu",
        "Campi",
        "Lilo"
      ],
      "time_they_were_killed": {
        "value": "2021-11-20T15:26:59.364Z"
      }
    }
];

function transformJSObject(columnObject) {
  if (columnObject === undefined || columnObject === null) {
    return "";
  } else {
    const columnNames = Object.keys(columnObject);
    if (columnNames.length === 1 && columnNames.includes("value")) {
      return columnObject["value"];
    } else if (columnNames.length === 0) {
      return ""
    } else {
      return JSON.stringify(columnObject, null, "  ");
    }
  }
}
// Clean it up
function wrapDataInHTML(data) {
  // obtain header
  let html = '<tr><td></td>';
  const columnNames = Object.keys(data[0]);
  for (const name of columnNames) {
    html += `<td>${name}</td>`;
  };
  html += '</tr>';

  // check type of columns. We want to know whether
  // a column is an array, and get the largest array for each
  // row in order to know how many subrows that row should have

  // Once we know what columns are arrays, we have to start out
  // by checking which is the largest array for that given row

  // if object and only one key and key is value show it as string -->
  // handle objects in different method
  let arrayColumnNames = [];
  const firstRow = data[0];
  for (const name of columnNames) {
    if (Array.isArray(firstRow[name])) {
      arrayColumnNames.push(name);
    }
  }

  for (let pos = 0; pos < data.length; pos++) {
    let row = data[pos];
    // we only need to do this for the tables where there are
    // array columns.
    if (arrayColumnNames.length > 0) {
      let maximumLength = 0;
      // checks number of subrows needed for that row
      for (const name of arrayColumnNames) {
        if (row[name].length > maximumLength) {
          maximumLength = row[name].length;
        }
      }

      for (let subrow = 0; subrow < maximumLength; subrow++) {
        // we want the first column to indicate the number
        // of the row
        if (subrow === 0) {
          html += `<tr><td>${pos + 1}</td>`;
        } else {
          html += `<tr><td></td>`;
        }
        for (const name of columnNames) {
          // if column is array, use subrow
          if (arrayColumnNames.includes(name)) {
            const content = row[name][subrow];
            if (content === undefined || content === null) {
              html += `<td></td>`;
            } else if (content instanceof Object && Array.isArray(content) == false) {
              const value = transformJSObject(content);
              html += `<td>${value}</td>`;
            } else {
              html += `<td>${content}</td>`;
            }
          // beyond the first subrow, non-array columns should be empty
          } else if (subrow > 0) {
            html += `<td></td>`;
          } else if (row[name] instanceof Object && arrayColumnNames.includes(name) === false) {
            const value = transformJSObject(row[name]);
            html += `<td>${value}</td>`;
          } else {
            html += `<td>${row[name]}</td>`;
          }
        }

        html += '</tr>';
      } 
    } else {
      html += `<tr><td>${pos + 1}</td>`;
      for (const name of columnNames) {
        if (row[name] instanceof Object && arrayColumnNames.includes(name) === false) {
          const value = transformJSObject(row[name]);
          html += `<td>${value}</td>`;
        } else {
          html += `<td>${row[name]}</td>`;
        }
      }
      html += '</tr>';
    }
  }

  return html;
}

const html = wrapDataInHTML(data);

console.log(html);