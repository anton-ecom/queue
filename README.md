# Queue Unit

```bash
   ____                          _    _       _ _   
  / __ \                        | |  | |     (_) |  
 | |  | |_   _  ___ _   _  ___  | |  | |_ __  _| |_ 
 | |  | | | | |/ _ \ | | |/ _ \ | |  | | '_ \| | __|
 | |__| | |_| |  __/ |_| |  __/ | |__| | | | | | |_ 
  \___\_\\__,_|\___|\__,_|\___|  \____/|_| |_|_|\__|
                                                    
version: 1.0.0                                              
```

Job queue operations with adapter-first architecture, built with Unit Architecture.

## Features

- **Adapter-First Architecture** - Pluggable queue backends (Memory, Redis, and more)
- **Consciousness-Based Design** - Built on Unit Architecture with teaching/learning capabilities
- **Production Ready** - Designed for scalability with proper error handling and monitoring
- **Simple API** - Clean, intuitive interface that grows with your needs
- **Flexible Configuration** - Extensive options for job priorities, delays, retries, and more
- **Built-in Monitoring** - Queue statistics and health checks out of the box
- **Test-Friendly** - Easy to test with memory adapter and comprehensive test utilities

## 📦 Installation

```bash
npm install @synet/queue
```

## 🚀 Quick Start

### Memory Queue (Development)

```typescript
import { Queue, MemoryQueueAdapter } from '@synet/queue';

// Create queue with memory adapter
const memory = new MemoryQueueAdapter();
const queue = Queue.create({ adapter: memory });

// Process jobs
queue.process('email', async (job) => {
  console.log('Sending email:', job.data);
  // Your email logic here
});

// Add jobs
await queue.add('email', { 
  to: 'user@example.com', 
  subject: 'Welcome!' 
});

// Monitor progress
const stats = await queue.getStats();
console.log('Queue stats:', stats);
```

### Redis Queue (Production)

```typescript
import { Queue, RedisQueueAdapter } from '@synet/queue';

// Create queue with Redis adapter
const redis = new RedisQueueAdapter({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  prefix: 'myapp'
});
const queue = Queue.create({ adapter: redis });

// Same API as memory queue!
queue.process('data-processing', async (job) => {
  console.log('Processing batch:', job.data.batchId);
  // Your processing logic here
});

await queue.add('data-processing', { 
  batchId: 'batch-001', 
  records: 1000 
});
```

## Core Concepts

### Jobs

Jobs are the fundamental unit of work in the queue system:

```typescript
interface Job {
  id: string;                    // Unique identifier
  type: string;                  // Job type for routing
  data: Record<string, unknown>; // Job payload
  attempts?: number;             // Processing attempts
  delay?: number;                // Delay before processing (ms)
  priority?: number;             // Job priority (higher = first)
  createdAt?: Date;             // Creation timestamp
  processedAt?: Date;           // Processing start time
  completedAt?: Date;           // Completion time
  failedReason?: string;        // Failure message
}
```

### Job Options

Control job behavior with options:

```typescript
await queue.add('email', emailData, {
  priority: 10,           // Higher priority jobs run first
  delay: 5000,           // Wait 5 seconds before processing
  attempts: 3,           // Retry up to 3 times on failure
  timeout: 30000,        // 30 second timeout
  removeOnComplete: true, // Clean up successful jobs
  removeOnFail: false    // Keep failed jobs for debugging
});
```

### Job Processing

Register processors for different job types:

```typescript
// Simple processor
queue.process('email', async (job) => {
  await sendEmail(job.data.to, job.data.subject, job.data.body);
});

// Processor with error handling
queue.process('image-resize', async (job) => {
  try {
    const result = await resizeImage(job.data.imageUrl, job.data.size);
    console.log('Image resized:', result.url);
  } catch (error) {
    console.error('Resize failed:', error);
    throw error; // Will mark job as failed
  }
});
```

## Adapters

### Memory Adapter

Perfect for development, testing, and single-instance applications:

```typescript
import { MemoryQueueAdapter } from '@synet/queue';

const adapter = new MemoryQueueAdapter({
  name: 'my-queue',
  concurrency: 2,        // Process 2 jobs simultaneously
  defaultTimeout: 30000  // 30 second default timeout
});
```

### Redis Adapter

Production-ready with persistence and distributed processing:

```typescript
import { RedisQueueAdapter } from '@synet/queue';

const adapter = new RedisQueueAdapter({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  db: 0,
  prefix: 'queue',       // Key prefix for organization
  concurrency: 5,        // Process 5 jobs simultaneously
  defaultTimeout: 60000  // 60 second default timeout
});
```

### Custom Adapters

Create your own adapter by implementing `IQueueAdapter`:

```typescript
import { IQueueAdapter, Job, JobOptions, JobHandler, JobStatus, QueueStats } from '@synet/queue';

class CustomQueueAdapter implements IQueueAdapter {
  readonly name = 'custom';
  readonly config: Record<string, unknown>;
  
  constructor(config: any) {
    this.config = config;
  }
  
  async add(type: string, data: Record<string, unknown>, options?: JobOptions): Promise<Job> {
    // Your implementation
  }
  
  process(type: string, handler: JobHandler): void {
    // Your implementation
  }
  
  // ... implement other required methods
}
```

## Unit Architecture Integration

`@synet/queue` is built on SYNET Unit Architecture, enabling consciousness-based composition:

### Teaching Capabilities

```typescript
// Queue can teach its capabilities to other units
const contract = queue.teach();

// Other units can learn queue operations
otherUnit.learn([contract]);

// Now otherUnit can operate the queue
await otherUnit.execute('queue.add', 'email', { to: 'user@example.com' });
const stats = await otherUnit.execute('queue.getStats');
```

### Unit Composition

```typescript
class EmailService extends Unit<EmailServiceProps> {
  
  async sendWelcomeEmail(userId: string, email: string) {
    // Use learned queue capabilities
    if (this.can('queue.add')) {
      return this.execute('queue.add', 'welcome-email', { userId, email });
    }
    
    // Fallback to direct email sending
    return this.sendEmailDirect(email, 'Welcome!', 'Thanks for joining!');
  }
  
  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        sendWelcomeEmail: this.sendWelcomeEmail.bind(this)
      }
    };
  }
}

// Compose services
const emailService = EmailService.create(config);
emailService.learn([queue.teach()]);
```

## Monitoring & Health

### Queue Statistics

```typescript
const stats = await queue.getStats();
console.log({
  waiting: stats.waiting,    // Jobs waiting to be processed
  active: stats.active,      // Jobs currently being processed
  completed: stats.completed, // Successfully completed jobs
  failed: stats.failed,      // Failed jobs
  delayed: stats.delayed     // Jobs waiting for delay to pass
});
```

### Health Checks

```typescript
const isHealthy = await queue.isHealthy();
if (!isHealthy) {
  console.error('Queue is unhealthy!');
  // Handle reconnection, alerting, etc.
}
```

### Job Status Monitoring

```typescript
// Get jobs by status
const failedJobs = await queue.getJobs('failed');
const activeJobs = await queue.getJobs('active');

// Get specific job
const job = await queue.getJob('job_1234567890_abc123');
if (job?.failedReason) {
  console.error('Job failed:', job.failedReason);
}
```

## ⚙️ Queue Control

### Pause/Resume Processing

```typescript
// Pause processing (useful for maintenance)
await queue.pause();

// Jobs will continue to be added but won't be processed
await queue.add('email', { to: 'user@example.com' });

// Resume processing
await queue.resume();
```

### Graceful Shutdown

```typescript
// Close queue and cleanup resources
await queue.close();
```

### Job Management

```typescript
// Remove a specific job
const removed = await queue.remove('job_1234567890_abc123');

// Get job details
const job = await queue.getJob('job_1234567890_abc123');
if (job) {
  console.log('Job status:', job.completedAt ? 'completed' : 'pending');
}
```

## 🧪 Testing

### Test with Memory Adapter

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Queue, MemoryQueueAdapter } from '@synet/queue';

describe('Email Service', () => {
  let queue: Queue;
  
  beforeEach(() => {
    const adapter = new MemoryQueueAdapter();
    queue = Queue.create({ adapter });
  });
  
  afterEach(async () => {
    await queue.close();
  });
  
  it('should process email jobs', async () => {
    const emails: any[] = [];
    
    queue.process('email', async (job) => {
      emails.push(job.data);
    });
    
    await queue.add('email', { to: 'test@example.com' });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('test@example.com');
  });
});
```

### Mock Adapters

```typescript
import { vi } from 'vitest';

const mockAdapter = {
  name: 'mock',
  config: {},
  add: vi.fn(),
  process: vi.fn(),
  getStats: vi.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
  // ... other methods
};

const queue = Queue.create({ adapter: mockAdapter as any });
```

## 🎯 Use Cases

### Background Job Processing

```typescript
// Email notifications
queue.process('email', async (job) => {
  await emailService.send(job.data.to, job.data.template, job.data.data);
});

// Image processing
queue.process('image-resize', async (job) => {
  await imageService.resize(job.data.imageId, job.data.sizes);
});

// Data exports
queue.process('export', async (job) => {
  await exportService.generateReport(job.data.userId, job.data.format);
});
```

### Scheduled Tasks

```typescript
// Daily reports (delayed execution)
await queue.add('daily-report', { date: '2024-01-15' }, { 
  delay: 24 * 60 * 60 * 1000 // 24 hours
});

// Reminder emails
await queue.add('reminder', { userId: 123 }, { 
  delay: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

### Priority Processing

```typescript
// Critical system alerts (high priority)
await queue.add('alert', { level: 'critical' }, { priority: 10 });

// Regular notifications (normal priority)
await queue.add('notification', { message: 'Update available' }, { priority: 1 });
```

### Batch Processing

```typescript
// Process large datasets in chunks
for (let i = 0; i < 1000; i += 100) {
  await queue.add('batch-process', { 
    startId: i, 
    endId: i + 100 
  });
}
```

## 🔧 Configuration Examples

### Development Setup

```typescript
import { Queue, MemoryQueueAdapter } from '@synet/queue';

const queue = Queue.create({
  adapter: new MemoryQueueAdapter({
    concurrency: 1,
    defaultTimeout: 5000
  }),
  description: 'Development queue for testing'
});
```

### Production Setup

```typescript
import { Queue, RedisQueueAdapter } from '@synet/queue';

const queue = Queue.create({
  adapter: new RedisQueueAdapter({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.QUEUE_PREFIX || 'prod',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
    defaultTimeout: parseInt(process.env.QUEUE_TIMEOUT || '60000')
  }),
  description: 'Production queue for scalable job processing'
});
```

### High-Availability Setup

```typescript
const queue = Queue.create({
  adapter: new RedisQueueAdapter({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    prefix: 'ha-queue',
    concurrency: 10,
    defaultTimeout: 120000
  })
});

// Health monitoring
setInterval(async () => {
  const healthy = await queue.isHealthy();
  if (!healthy) {
    console.error('Queue health check failed');
    // Trigger alerts, reconnection logic, etc.
  }
}, 30000);
```

## 📚 API Reference

### Queue Class

#### Static Methods

- `Queue.create(config: QueueConfig): Queue` - Create new queue instance

#### Instance Methods

- `add(type: string, data: Record<string, unknown>, options?: JobOptions): Promise<Job>` - Add job to queue
- `process(type: string, handler: JobHandler): void` - Register job processor
- `remove(jobId: string): Promise<boolean>` - Remove job from queue
- `getJob(jobId: string): Promise<Job | null>` - Get specific job
- `getJobs(status: JobStatus): Promise<Job[]>` - Get jobs by status
- `getStats(): Promise<QueueStats>` - Get queue statistics
- `pause(): Promise<void>` - Pause queue processing
- `resume(): Promise<void>` - Resume queue processing
- `close(): Promise<void>` - Close queue and cleanup
- `isHealthy(): Promise<boolean>` - Check queue health
- `getAdapter(): { name: string; config: Record<string, unknown> }` - Get adapter info

#### Unit Architecture Methods

- `teach(): TeachingContract` - Teach capabilities to other units
- `help(): string` - Get help documentation
- `whoami(): string` - Get unit identity

### Adapters

#### MemoryQueueAdapter

```typescript
new MemoryQueueAdapter(config?: {
  name?: string;
  concurrency?: number;
  defaultTimeout?: number;
})
```

#### RedisQueueAdapter

```typescript
new RedisQueueAdapter(config?: {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  prefix?: string;
  concurrency?: number;
  defaultTimeout?: number;
})
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT © [SYNET](https://github.com/synthetism/synet)

## 🔗 Related Packages

- [@synet/unit](../unit/) - Core Unit Architecture foundation
- [@synet/event](../event/) - Event handling with provider patterns
- [@synet/realtime](../realtime/) - Real-time communication capabilities
- [@synet/storage](../storage/) - Storage operations with adapter patterns

---

Built with ❤️ by the SYNET community
