import { app } from '@azure/functions';
import { contentSubmissionFunction } from './functions/content-submission';
import { rssFeedFunction } from './functions/rss-feed';
import { healthCheckFunction } from './functions/health-check';

// Register Azure Functions
app.http('contentSubmission', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'content',
  handler: contentSubmissionFunction
});

app.http('rssFeed', {
  methods: ['GET'],
  authLevel: 'anonymous', 
  route: 'rss/{feedId?}',
  handler: rssFeedFunction
});

app.http('healthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheckFunction
});

export default app;