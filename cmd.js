const fileNamePath = 'file:///home/juan/coding/learn/dbt/dbt-northwind-analytics/target/compiled/northwind/models/staging/stg_customers.sql';
const compiledPath = '/home/juan/coding/learn/dbt/dbt-northwind-analytics/target/compiled/northwind/models/staging/stg_customers.sql';

console.log(fileNamePath.includes(compiledPath));