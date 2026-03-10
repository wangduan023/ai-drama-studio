/**
 * Enhanced SSE Queue Usage Examples
 *
 * This file demonstrates how to use the enhanced SSE queue functionality
 * that improves reliability, performance and features of the SSE system.
 */

import {
  reportTaskProgressEnhanced,
  reportTaskStreamChunkEnhanced,
  type TaskJobData,
  type StreamChunk
} from '@ai-drama-studio/sse'

// Example: Using enhanced progress reporter in a worker
async function exampleEnhancedProgressReporting(jobData: TaskJobData) {
  // Basic usage with default options
  await reportTaskProgressEnhanced(jobData, 10, {
    stage: 'preparing',
    message: 'Starting task preparation'
  })

  // Advanced usage with custom options
  await reportTaskProgressEnhanced(
    jobData,
    25,
    {
      stage: 'processing',
      message: 'Processing data...'
    },
    {
      minProgressDelta: 2,      // Only report if progress changes by 2% or more
      debounceUpdates: true,    // Prevent too-frequent updates
      persist: true,           // Persist to database
      verbose: true           // Log progress to console
    }
  )

  // Report stream chunks with enhanced functionality
  const streamChunk: StreamChunk = {
    kind: 'text',
    delta: 'Hello, world!',
    seq: 1
  }

  await reportTaskStreamChunkEnhanced(
    jobData,
    streamChunk,
    {
      lane: 'output_stream'
    },
    {
      persist: true,
      verbose: true
    }
  )
}

// Example: Image generation worker with enhanced reporting
async function imageGenerationWorker(jobData: TaskJobData) {
  console.log(`Starting image generation for task ${jobData.taskId}`)

  // Step 1: Preparing
  await reportTaskProgressEnhanced(
    jobData,
    10,
    { stage: 'prepare', message: 'Preparing image generation parameters' },
    { verbose: true }
  )

  // Step 2: Processing
  await reportTaskProgressEnhanced(
    jobData,
    30,
    { stage: 'generate', message: 'Generating image...' },
    { verbose: true }
  )

  // Simulate processing with intermediate updates
  for (let i = 30; i <= 90; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate work
    await reportTaskProgressEnhanced(
      jobData,
      i,
      { stage: 'generate', message: `Generating: ${i}% complete` },
      { minProgressDelta: 5 } // Only report if change is significant
    )
  }

  // Step 3: Completion
  await reportTaskProgressEnhanced(
    jobData,
    100,
    { stage: 'complete', message: 'Image generation completed' },
    { verbose: true }
  )

  console.log(`Completed image generation for task ${jobData.taskId}`)
}

// Example: LLM streaming with enhanced chunk reporting
async function llmStreamingWorker(jobData: TaskJobData) {
  console.log(`Starting LLM streaming for task ${jobData.taskId}`)

  await reportTaskProgressEnhanced(
    jobData,
    5,
    { stage: 'stream-start', message: 'Initializing LLM stream' },
    { verbose: true }
  )

  // Simulate streaming response
  const responseChunks = [
    { kind: 'text', delta: 'The', seq: 1 },
    { kind: 'text', delta: ' quick', seq: 2 },
    { kind: 'text', delta: ' brown', seq: 3 },
    { kind: 'text', delta: ' fox', seq: 4 },
    { kind: 'text', delta: ' jumps', seq: 5 },
    { kind: 'text', delta: ' over', seq: 6 },
    { kind: 'text', delta: ' the', seq: 7 },
    { kind: 'text', delta: ' lazy', seq: 8 },
    { kind: 'text', delta: ' dog.', seq: 9 }
  ]

  for (const chunk of responseChunks) {
    await new Promise(resolve => setTimeout(resolve, 200)) // Simulate streaming delay
    await reportTaskStreamChunkEnhanced(
      jobData,
      chunk as StreamChunk,
      { stage: 'streaming', message: `Streaming token ${chunk.seq}` },
      { verbose: true }
    )
  }

  await reportTaskProgressEnhanced(
    jobData,
    100,
    { stage: 'complete', message: 'LLM streaming completed' },
    { verbose: true }
  )
}

export {
  exampleEnhancedProgressReporting,
  imageGenerationWorker,
  llmStreamingWorker
}