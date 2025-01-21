const fs = require('fs');
const snowflake = require('snowflake-sdk');

// Snowflake credentials from inputs
const snowflakeConfig = {
  account: process.env.SNOWFLAKE_HOST,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  table: process.env.SNOWFLAKE_TABLE,
};

// Helper: Parse the coverage file based on the coverage tool
function parseCoverageFile(filePath, coverageTool) {
  const fileData = fs.readFileSync(filePath, 'utf8');

  switch (coverageTool.toLowerCase()) {
    case 'go':
      const goMatch = fileData.match(/total:\s*\(statements\)\s*([\d.]+)%/);
      if (!goMatch) throw new Error('Could not parse Go coverage from file.');
      
      return {
        coverage: parseFloat(goMatch[1]).toFixed(2),
        testCount: null, // Go coverage output doesn't include test counts
        testsSkipped: 0,
      };

    case 'pytest':
      const pytestMatch = fileData.match(/TOTAL\s+\d+\s+\d+\s+([\d.]+)%/);
      // Get test counts
      const testsCollected = fileData.match(/collected (\d+) items/);
      const testsPassed = fileData.match(/(\d+) passed/);
      const testsSkipped = fileData.match(/(\d+) skipped/);
      const timeMatch = fileData.match(/in ([\d.]+)s/);

      if (!pytestMatch) throw new Error('Could not parse Python coverage from file.');

      return {
        coverage: parseFloat(pytestMatch[1]).toFixed(2),
        testCount: testsCollected ? parseInt(testsCollected[1]) : null,
        testsSkipped: testsSkipped ? parseInt(testsSkipped[1]) : 0,
      };

    default:
      throw new Error(`Unsupported coverage tool: ${coverageTool}`);
  }
}

// Push coverage data to Snowflake
function pushToSnowflake(repoName, coverageData) {
  console.log('Connecting to Snowflake...');
  const connection = snowflake.createConnection(snowflakeConfig);

  connection.connect((err) => {
    if (err) {
      console.error('Unable to connect to Snowflake:', err.message);
      process.exit(1);
    }
    console.log('Connected to Snowflake.');

    const query = `
      INSERT INTO ${snowflakeConfig.schema}.${snowflakeConfig.database}.${snowflakeConfig.table}
      (REPOSITORY_NAME, COVERAGE_PERCENT, NUMBER_OF_TESTS, NUMBER_OF_SKIPPED_TESTS, LAST_MODIFIED)
      VALUES
      (
        '${repoName}',
        ${coverageData.coverage},
        ${coverageData.testCount || 'NULL'},
        ${coverageData.testsSkipped},
        CURRENT_TIMESTAMP()
      );
    `;

    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Failed to insert data:', err.message);
          process.exit(1);
        }
        console.log(`Inserted ${rows.length} rows into Snowflake.`);
        connection.destroy();
      },
    });
  });
}

// Only run the main execution if this is the main module
if (require.main === module) {
  try {
    const coverageFile = process.env.INPUT_COVERAGE_FILE;
    const coverageTool = process.env.INPUT_COVERAGE_TOOL;
    const repoName = process.env.INPUT_REPO_NAME;

    console.log('Parsing coverage file...');
    const coverageData = parseCoverageFile(coverageFile, coverageTool);

    console.log(`Coverage data for ${repoName} using ${coverageTool}:`, coverageData);

    pushToSnowflake(repoName, coverageData);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export functions for testing
module.exports = {
  parseCoverageFile,
  pushToSnowflake
};