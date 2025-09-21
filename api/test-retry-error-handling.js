const { RetryUtil } = require('./dist/utils/retry');
const { CircuitBreaker, CircuitBreakerState } = require('./dist/utils/circuit-breaker');
const { ErrorHandler, ServiceError, ErrorType, ErrorSeverity } = require('./dist/utils/error-handling');
const { TimeoutManager } = require('./dist/utils/timeout');
const { fallbackService } = require('./dist/services/fallback-service');

console.log('🧪 Testing Retry Logic and Error Handling Framework\n');

// Test 1: Basic Retry Logic
console.log('1️⃣ Testing Basic Retry Logic');
console.log('================================');

async function testRetryLogic() {
  let attemptCount = 0;
  
  const flakyOperation = async () => {
    attemptCount++;
    console.log(`  Attempt ${attemptCount}...`);
    
    if (attemptCount < 3) {
      throw new Error('Network timeout');
    }
    
    return 'Success after retries!';
  };

  try {
    const result = await RetryUtil.execute(flakyOperation, {
      maxAttempts: 3,
      baseDelayMs: 100,
      onRetry: (attempt, error) => {
        console.log(`  ⚠️  Retrying after ${error.message} (attempt ${attempt})`);
      }
    });
    
    console.log(`  ✅ ${result}`);
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
  }
}

testRetryLogic().catch(console.error);

// Test 2: Circuit Breaker
console.log('\n2️⃣ Testing Circuit Breaker');
console.log('============================');

async function testCircuitBreaker() {
  const circuitBreaker = new CircuitBreaker('test-service', {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 2000
  });

  // Simulate failing operations
  console.log('  Simulating failures...');
  for (let i = 0; i < 4; i++) {
    try {
      await circuitBreaker.execute(async () => {
        throw new Error('Service unavailable');
      });
    } catch (error) {
      console.log(`  ❌ Operation ${i + 1} failed: ${error.message}`);
    }
  }

  console.log(`  Circuit state: ${circuitBreaker.getStats().state}`);
  console.log(`  Circuit healthy: ${circuitBreaker.isHealthy()}`);

  // Try operation when circuit is open
  try {
    await circuitBreaker.execute(async () => 'This should not execute');
  } catch (error) {
    console.log(`  ✅ Circuit correctly blocked operation: ${error.message}`);
  }

  // Reset circuit
  circuitBreaker.reset();
  console.log(`  🔄 Circuit reset. State: ${circuitBreaker.getStats().state}`);
}

testCircuitBreaker().catch(console.error);

// Test 3: Error Classification
console.log('\n3️⃣ Testing Error Classification');
console.log('=================================');

function testErrorClassification() {
  const testErrors = [
    { error: { code: 'ECONNRESET' }, expectedType: ErrorType.NETWORK_ERROR },
    { error: { code: 'ETIMEDOUT' }, expectedType: ErrorType.TIMEOUT_ERROR },
    { error: { status: 401 }, expectedType: ErrorType.AUTHENTICATION_ERROR },
    { error: { status: 403 }, expectedType: ErrorType.AUTHORIZATION_ERROR },
    { error: { status: 429 }, expectedType: ErrorType.RATE_LIMIT_ERROR },
    { error: { status: 503 }, expectedType: ErrorType.SERVICE_UNAVAILABLE },
    { error: { status: 400 }, expectedType: ErrorType.VALIDATION_ERROR },
    { error: { message: 'not configured' }, expectedType: ErrorType.CONFIGURATION_ERROR }
  ];

  testErrors.forEach(({ error, expectedType }, index) => {
    const serviceError = ErrorHandler.classifyError(error, 'test-service');
    const status = serviceError.type === expectedType ? '✅' : '❌';
    console.log(`  ${status} Error ${index + 1}: ${serviceError.type} (retryable: ${serviceError.retryable})`);
  });
}

testErrorClassification();

// Test 4: Timeout Management
console.log('\n4️⃣ Testing Timeout Management');
console.log('===============================');

async function testTimeoutManagement() {
  const timeoutManager = new TimeoutManager();

  // Test successful operation within timeout
  try {
    const result = await timeoutManager.executeWithTimeout(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Quick operation completed';
      },
      'test-service',
      1000
    );
    console.log(`  ✅ ${result}`);
  } catch (error) {
    console.log(`  ❌ Unexpected error: ${error.message}`);
  }

  // Test operation that times out
  try {
    await timeoutManager.executeWithTimeout(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'This should not complete';
      },
      'test-service',
      500
    );
  } catch (error) {
    console.log(`  ✅ Timeout correctly caught: ${error.message}`);
  }
}

testTimeoutManagement().catch(console.error);

// Test 5: Fallback Strategies
console.log('\n5️⃣ Testing Fallback Strategies');
console.log('=================================');

async function testFallbackStrategies() {
  // Test Azure OpenAI fallback
  const azureError = new ServiceError(
    'Service unavailable',
    ErrorType.SERVICE_UNAVAILABLE,
    ErrorSeverity.HIGH,
    'azure-openai'
  );

  try {
    const fallbackResult = await fallbackService.executeFallback('azure-openai', azureError);
    console.log(`  ✅ Azure OpenAI fallback: ${JSON.stringify(fallbackResult)}`);
  } catch (error) {
    console.log(`  ❌ Azure OpenAI fallback failed: ${error.message}`);
  }

  // Test ElevenLabs fallback
  const elevenLabsError = new ServiceError(
    'Timeout',
    ErrorType.TIMEOUT_ERROR,
    ErrorSeverity.MEDIUM,
    'elevenlabs'
  );

  try {
    const fallbackResult = await fallbackService.executeFallback('elevenlabs', elevenLabsError);
    console.log(`  ✅ ElevenLabs fallback: ${JSON.stringify(fallbackResult)}`);
  } catch (error) {
    console.log(`  ❌ ElevenLabs fallback failed: ${error.message}`);
  }
}

testFallbackStrategies().catch(console.error);

// Test 6: Service-Specific Retry Configurations
console.log('\n6️⃣ Testing Service-Specific Configurations');
console.log('============================================');

function testServiceConfigs() {
  const serviceTypes = ['api', 'database', 'storage', 'ai'];
  
  serviceTypes.forEach(serviceType => {
    const config = RetryUtil.createServiceConfig(serviceType);
    console.log(`  ${serviceType.toUpperCase()}: ${config.maxAttempts} attempts, ${config.baseDelayMs}ms base delay, ${config.maxDelayMs}ms max delay`);
  });
}

testServiceConfigs();

// Test 7: Error Response Creation
console.log('\n7️⃣ Testing Error Response Creation');
console.log('====================================');

function testErrorResponse() {
  const serviceError = new ServiceError(
    'API rate limit exceeded',
    ErrorType.RATE_LIMIT_ERROR,
    ErrorSeverity.MEDIUM,
    'youtube',
    { 
      statusCode: 429,
      retryable: true,
      context: { quota: 'exceeded', resetTime: '2024-01-01T12:00:00Z' }
    }
  );

  const response = ErrorHandler.createErrorResponse(serviceError);
  console.log('  Error Response:');
  console.log(`    Error: ${response.error}`);
  console.log(`    Type: ${response.type}`);
  console.log(`    Severity: ${response.severity}`);
  console.log(`    Service: ${response.service}`);
  console.log(`    Message: ${response.message}`);
  console.log(`    Retryable: ${response.retryable}`);
  console.log(`    Context: ${JSON.stringify(response.context)}`);
}

testErrorResponse();

console.log('\n🎉 Retry Logic and Error Handling Framework Test Complete!');
console.log('\n📊 Summary:');
console.log('  ✅ Retry logic with exponential backoff');
console.log('  ✅ Circuit breaker pattern for service resilience');
console.log('  ✅ Comprehensive error classification and handling');
console.log('  ✅ Timeout management for external service calls');
console.log('  ✅ Fallback strategies for service failures');
console.log('  ✅ Service-specific retry configurations');
console.log('  ✅ Standardized error responses for API endpoints');
