const fs = require('fs');
const path = require('path');
const { parseCoverageFile } = require('../index');

describe('parseCoverageFile', () => {
  const goCoverageFile = path.join(__dirname, 'go-cover.out');
  const pytestCoverageFile = path.join(__dirname, 'pytest-coverage.txt');

  test('parses Go coverage file correctly', () => {
    const coverage = parseCoverageFile(goCoverageFile, 'go');
    expect(coverage).toEqual({
      coverage: '38.90',
      testCount: null,
      testsSkipped: 0,
    });
  });

  test('parses Pytest coverage file correctly with full details', () => {
    const result = parseCoverageFile(pytestCoverageFile, 'pytest');
    expect(result).toEqual({
      coverage: '89.00',
      testCount: 99,
      testsSkipped: 0,
    });
  });

  test('throws error for invalid coverage tool', () => {
    expect(() => {
      parseCoverageFile(goCoverageFile, 'invalid-tool');
    }).toThrow('Unsupported coverage tool: invalid-tool');
  });

  test('throws error for invalid Go coverage file', () => {
    expect(() => {
      parseCoverageFile('nonexistent.txt', 'go');
    }).toThrow();
  });

  test('throws error for invalid Pytest coverage file', () => {
    expect(() => {
      parseCoverageFile('nonexistent.txt', 'pytest');
    }).toThrow();
  });

  test('throws error for malformed Go coverage file', () => {
    const tempFile = path.join(__dirname, 'temp-malformed.txt');
    fs.writeFileSync(tempFile, 'invalid content');
    
    expect(() => {
      parseCoverageFile(tempFile, 'go');
    }).toThrow('Could not parse Go coverage from file.');

    fs.unlinkSync(tempFile);
  });

  test('throws error for malformed Pytest coverage file', () => {
    const tempFile = path.join(__dirname, 'temp-malformed.txt');
    fs.writeFileSync(tempFile, 'invalid content');
    
    expect(() => {
      parseCoverageFile(tempFile, 'pytest');
    }).toThrow('Could not parse Python coverage from file.');

    fs.unlinkSync(tempFile);
  });
});
