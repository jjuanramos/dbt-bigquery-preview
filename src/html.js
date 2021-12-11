export class HTMLResultsWrapper {
  constructor(data) {
      this.data = data;
      this.columnNames = Object.keys(data[0]);
  }

  getDataWrapped(scriptUri, stylesUri) {
      const htmlData = this.wrapDataInHTML();
      const dataWrapped = this.createHTMLTemplate(htmlData, scriptUri, stylesUri);
      return dataWrapped;
  }

  createHTMLTemplate(table, scriptUri, stylesUri) {
        return `<!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview dbt</title>
            <link href="${stylesUri}" rel="stylesheet">

            <script src='${scriptUri}' defer></script>
        </head>

        <body>
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
            content = jsObject["value"] ? jsObject["value"] : "";
          } else if (
              columnNames.includes("c") &&
              columnNames.includes("s") &&
              columnNames.includes("e") &&
              columnNames.includes("constructor")
          ) {
            const valueEndsAt = jsObject["e"];
            const valueLength = jsObject["c"].length;
            if ((valueEndsAt + 1) === valueLength) {
                content = jsObject["c"] ? jsObject["c"].join("") : '';
            } else {
                const integerPart = jsObject["c"].slice(0, valueEndsAt + 1).join('');
                const decimals = jsObject["c"].slice(valueEndsAt + 1).join('');
                content = integerPart ? `${integerPart}.${decimals}` : '';
            }
          } else if (columnNames.length === 0) {
            content = "";
          } else {
            for (const columnName of columnNames) {
                let columnContent = jsObject[columnName];
                content += `
                ${columnName}: ${columnContent ? columnContent : ''},<br><br>
                `;
            }
            content = `
            <div class="collapsible">
                <p>
                    { ... }
                </p>
            </div>
            <div class="content">
                <br>
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

  createHTMLHeader(rowStyle) {
      let htmlHeader = `<tr class="${rowStyle} header"><th></th>`;
      for (const name of this.columnNames) {
          htmlHeader += `<th>${name}</th>`;
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
              htmlRow += `<tr class="${rowStyle}"><td>${pos + 1}</td>`;
            } else {
              htmlRow += `<tr class="${rowStyle}"><td></td>`;
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
                  htmlRow += `<td>${row[name] ? row[name] : ''}</td>`;
              }
          }
          htmlRow += '</tr>';
      }

      return htmlRow;
  }

  getHTMLforRow(row, pos, arrayColumnNames,rowStyle) {
      let htmlRow = `<tr class="${rowStyle}"><td>${pos + 1}</td>`;
      for (const name of this.columnNames) {
          if (row[name] instanceof Object && arrayColumnNames.includes(name) === false) {
              const htmlContent = this.wrapJSObject(row[name]);
              htmlRow += htmlContent;
          } else {
              htmlRow += `<td>${row[name] ? row[name] : ''}</td>`;
          }
      }
      htmlRow += '</tr>';
      
      return htmlRow;
  }

  wrapDataInHTML() {;
      let rowStyle = "even";
      let htmlData = this.createHTMLHeader(rowStyle);
      const arrayColumnNames = this.getArrayColumnNames();


      rowStyle = "odd";
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
