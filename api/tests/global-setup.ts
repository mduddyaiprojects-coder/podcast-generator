// Global test setup
export default async function globalSetup() {
  // Set test environment
  process.env['NODE_ENV'] = 'test';
  process.env['AZURE_FUNCTIONS_ENVIRONMENT'] = 'Development';
  
  // Disable console.log in tests to reduce noise
  if (process.env['CI'] === 'true') {
    console.log = () => {};
  }
}
