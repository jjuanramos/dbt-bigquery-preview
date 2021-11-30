export class HTMLResultsWrapper {
  constructor(data) {
      this.data = data;
      this.columnNames = Object.keys(data[0])
  }

  getDataWrapped() {
      const htmlData = this.wrapDataInHTML();
      const dataWrapped = this.createHTMLTemplate(htmlData);
      return dataWrapped;
  }

  createHTMLTemplate(table) {
        return `<!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview dbt</title>
            <style>               
            html {
            font-family: sans-serif;
            }

            .content {
            display: none;
            overflow: hidden;
            }

            table {
            border-collapse: collapse;
            border: 2px solid rgb(200,200,200);
            letter-spacing: 1px;
            font-size: 0.8rem;
            }

            td, th {
            border: 1px solid rgb(190,190,190);
            padding: 10px 20px;
            }

            th {
            background-color: rgb(235,235,235);
            }

            td {
            text-align: center;
            }

            .even {
            background-color: rgb(250,250,250);
            }

            .odd {
            background-color: rgb(245,245,245);
            }

            caption {
            padding: 10px;
            }

            .collapsible {
                font-style: italic;
            }
    
            .active .collapsible:hover {
                font-size: 1rem;
            }
    
            .content {
                font-size: 1rem;
                display: none;
            }
            </style>

            <script>
            const coll = document.getElementsByClassName("collapsible");
            console.log(coll)
            for (let i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function () {
                    console.log("HEY!")
                    this.classList.toggle("active");
                    const content = this.nextElementSibling;
                    if (content.style.display === "block") {
                        content.style.display = "none";
                    } else {
                        content.style.display = "block";
                    }
                });
            }
            </script>
        </head>

        <body style="padding: 10px;">
            <table>${table}</table>
        </body>

        </html>`;
  }

  wrapJSObject(jsObject) {
      let content = '';
      if (jsObject === undefined || jsObject === null) {
          content = "";
      } else {
          const columnNames = Object.keys(jsObject);
          if (columnNames.length === 1 && columnNames.includes("value")) {
            content = jsObject["value"];
          } else if (columnNames.length === 0) {
            content = "";
          } else {
            for (const columnName of columnNames) {
                let columnContent = jsObject[columnName];
                if (columnContent === undefined || columnContent === null) {
                    columnContent = "";
                }
                content += `
                ${columnName}: ${jsObject[columnName]},<br>
                `;
            }
            content = `
            <div class="collapsible">
                <p>
                    { ... }
                </p>
            </div>
            <div class="content">
                ${content}
            </div>`;
          }
      }
      return `
      <td>
          ${content}
      </td>
      `;
  }

  createHTMLHeader() {
      let htmlHeader = '<tr><td></td>';
      for (const name of this.columnNames) {
          htmlHeader += `<td>${name}</td>`;
      };
      htmlHeader += '</tr>';

      return htmlHeader;
  }

  getArrayColumnNames() {
      let arrayColumnNames = [];
      const firstRow = this.data[0];
      for (const name of this.columnNames) {
          if (Array.isArray(firstRow[name])) {
            arrayColumnNames.push(name);
          }
      }

      return arrayColumnNames;
  }

  getHTMLforRowWithArrayColumn(row, pos, maximumLength, arrayColumnNames, rowStyle) {
      let htmlRow = '';
      for (let subrow = 0; subrow < maximumLength; subrow++) {
          if (subrow === 0) {
            //   htmlRow += `<tr class="${rowStyle}"><td>${pos + 1}</td>`;
              htmlRow += `<tr><td>${pos + 1}</td>`;
            } else {
            //   htmlRow += `<tr class="${rowStyle}"><td></td>`;
              htmlRow += `<tr><td></td>`;
          }

          for (const name of this.columnNames) {
              if (arrayColumnNames.includes(name)) {
                  const content = row[name][subrow];
                  if (content === undefined || content === null) {
                      htmlRow += `<td></td>`;
                  } else if (content instanceof Object && Array.isArray(content) == false) {
                  const htmlContent = this.wrapJSObject(content);
                  htmlRow += htmlContent;
                  } else {
                      htmlRow += `<td>${content}</td>`;
                  }
              } else if (subrow > 0) {
                  // beyond the first subrow, non-array columns should
                  // always be empty
                  htmlRow += `<td></td>`;
              } else if (row[name] instanceof Object) {
                  const htmlContent = this.wrapJSObject(row[name]);
                  htmlRow += htmlContent;
              }else {
                  htmlRow += `<td>${row[name]}</td>`;
              }
          }
          htmlRow += '</tr>';
      }

      return htmlRow;
  }

  getHTMLforRow(row, pos, arrayColumnNames,rowStyle) {
    //   let htmlRow = `<tr class="${rowStyle}><td>${pos + 1}</td>`;
      let htmlRow = `<tr><td>${pos + 1}</td>`;
      for (const name of this.columnNames) {
          if (row[name] instanceof Object && arrayColumnNames.includes(name) === false) {
              const htmlContent = this.wrapJSObject(row[name]);
              htmlRow += htmlContent;
          } else {
              htmlRow += `<td>${row[name]}</td>`;
          }
      }
      htmlRow += '</tr>';
      
      return htmlRow;
  }

  wrapDataInHTML() {;
      let htmlData = this.createHTMLHeader();
      const arrayColumnNames = this.getArrayColumnNames();

      let rowStyle = "odd";
      for (let pos = 0; pos < this.data.length; pos++) {
          const row = this.data[pos];

          if (arrayColumnNames.length > 0) {
              let maximumLength = 0;
              for (const name of arrayColumnNames) {
                  if (row[name].length > maximumLength) {
                  maximumLength = row[name].length;
                  }
              }
              const htmlRow = this.getHTMLforRowWithArrayColumn(row, pos, maximumLength, arrayColumnNames, rowStyle);
              htmlData += htmlRow;

          } else {
              const htmlRow = this.getHTMLforRow(row, pos, arrayColumnNames, rowStyle);
              htmlData += htmlRow;
          }

          if (rowStyle === "odd") {
              rowStyle = "even";
          } else {
              rowStyle = "odd";
          }

      }

      return htmlData;
  }
}
