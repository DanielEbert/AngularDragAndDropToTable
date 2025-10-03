// To use this, install 'parquetjs-lite' with: npm install parquetjs-lite
import * as parquet from 'parquetjs-lite';

export async function generateTestParquetFile(filePath: string) {
    const schema = new parquet.ParquetSchema({
        id: { type: 'INT64' },
        name: { type: 'UTF8' },
        isActive: { type: 'BOOLEAN' },
    });

    const writer = await parquet.ParquetWriter.openFile(schema, filePath);

    // Generate 1000 rows
    for (let i = 1; i <= 1000; i++) {
        await writer.appendRow({
            id: i,
            name: `User_${i}`,
            isActive: i % 2 === 0, // alternate true/false
        });
    }

    await writer.close();
}
