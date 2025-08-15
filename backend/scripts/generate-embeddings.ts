import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../src/services/embeddingService';

const prisma = new PrismaClient();

async function generateEmbeddings() {
  console.log('🚀 Generating embeddings for test posts...');
  
  try {
    // Get all posts without embeddings
    const postsWithoutEmbeddings = await prisma.post.findMany({
      where: {
        OR: [
          { embedding: { isEmpty: true } },
          { embedding: { equals: [] } }
        ]
      },
      select: {
        id: true,
        content: true,
        isPolitical: true
      }
    });

    console.log(`Found ${postsWithoutEmbeddings.length} posts without embeddings`);

    if (postsWithoutEmbeddings.length === 0) {
      console.log('All posts already have embeddings!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Generate embeddings for each post
    for (const post of postsWithoutEmbeddings) {
      try {
        console.log(`Generating embedding for post: ${post.content.substring(0, 50)}...`);
        
        // Generate embedding using the same service used by the API
        const embedding = await EmbeddingService.generateEmbedding(post.content);
        
        // Update the post with the embedding
        await prisma.post.update({
          where: { id: post.id },
          data: { embedding: embedding }
        });
        
        successCount++;
        console.log(`✅ Generated embedding ${successCount}/${postsWithoutEmbeddings.length}`);
        
        // Small delay to avoid overwhelming the embedding service
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to generate embedding for post ${post.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n🎉 Embedding generation complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\nNow testing AI topic discovery...`);

    // Test the topic discovery system
    const { TopicDiscoveryService } = await import('../src/services/topicDiscoveryService');
    const topics = await TopicDiscoveryService.discoverTrendingTopics(24, 3, 10);
    
    console.log(`\n🎯 AI Topic Discovery Results:`);
    console.log(`   Found ${topics.length} trending topics`);
    
    for (const topic of topics) {
      console.log(`\n📊 Topic: ${topic.title}`);
      console.log(`   Posts: ${topic.postCount}, Participants: ${topic.participantCount}`);
      console.log(`   Summary: ${topic.summary}`);
      if (topic.prevailingPosition) {
        console.log(`   Prevailing: ${topic.prevailingPosition}`);
      }
      if (topic.leadingCritique) {
        console.log(`   Critique: ${topic.leadingCritique}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in embedding generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateEmbeddings();