// Usage: node generate-parquet.js
const { generateTestParquetFile } = require('../dist/parquet-generator');

generateTestParquetFile('test.parquet').then(() => {
    console.log('Parquet file "test.parquet" created in project root.');
}).catch(err => {
    console.error('Error generating Parquet file:', err);
});
