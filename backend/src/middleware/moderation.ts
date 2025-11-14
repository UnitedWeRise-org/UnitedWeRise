import { Request, Response, NextFunction } from 'express';
import { moderationService } from '../services/moderationService';
import { AuthRequest } from './auth';
import { logger } from '../services/logger';

// Middleware to check user suspension status
export const checkUserSuspension = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  try {
    const suspensionStatus = await moderationService.getUserSuspensionStatus(req.user.id);
    
    if (suspensionStatus.isSuspended) {
      const suspension = suspensionStatus.suspension;
      
      // Check if suspension allows the current action
      const path = req.path;
      const method = req.method;
      
      if (method === 'POST' && path.includes('/posts') && !suspensionStatus.canPost) {
        return res.status(403).json({
          error: 'Account suspended - posting restricted',
          suspension: {
            type: suspension.type,
            reason: suspension.reason,
            endsAt: suspension.endsAt,
            isPermanent: !suspension.endsAt
          }
        });
      }
      
      if (method === 'POST' && path.includes('/comments') && !suspensionStatus.canComment) {
        return res.status(403).json({
          error: 'Account suspended - commenting restricted',
          suspension: {
            type: suspension.type,
            reason: suspension.reason,
            endsAt: suspension.endsAt,
            isPermanent: !suspension.endsAt
          }
        });
      }
      
      // For full suspensions, block most actions
      if (suspension.type === 'PERMANENT' || suspension.type === 'TEMPORARY') {
        const allowedPaths = ['/auth/logout', '/auth/me', '/moderation/appeals'];
        const isAllowed = allowedPaths.some(allowedPath => path.includes(allowedPath));
        
        if (!isAllowed) {
          return res.status(403).json({
            error: 'Account suspended',
            suspension: {
              type: suspension.type,
              reason: suspension.reason,
              endsAt: suspension.endsAt,
              isPermanent: !suspension.endsAt,
              canAppeal: true
            }
          });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error({ error, userId: req.user?.id, path: req.path }, 'Suspension check error');
    next(); // Don't block on errors, but log them
  }
};

// Middleware to automatically moderate content
export const moderateContent = (contentType: 'POST' | 'COMMENT' | 'MESSAGE') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send method
    const originalSend = res.send;
    
    // Override res.send to capture response
    res.send = function(data: any) {
      try {
        // Only process successful responses
        if (res.statusCode >= 200 && res.statusCode < 300 && data) {
          let parsedData;
          
          try {
            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          } catch (e) {
            // If parsing fails, skip moderation
            return originalSend.call(this, data);
          }
          
          // Extract content and ID based on content type
          let content = '';
          let contentId = '';
          
          if (contentType === 'POST' && parsedData.post) {
            content = parsedData.post.content || '';
            contentId = parsedData.post.id || '';
          } else if (contentType === 'COMMENT' && parsedData.comment) {
            content = parsedData.comment.content || '';
            contentId = parsedData.comment.id || '';
          } else if (contentType === 'MESSAGE' && parsedData.message) {
            content = parsedData.message.content || '';
            contentId = parsedData.message.id || '';
          }
          
          // Queue content for analysis (don't wait for completion)
          if (content && contentId) {
            moderationService.analyzeContent(content, contentType, contentId)
              .catch(error => {
                logger.error({ error, contentType, contentId }, 'Content moderation error');
              });
          }
        }
      } catch (error) {
        logger.error({ error }, 'Moderation middleware error');
      }
      
      // Call original send method
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Rate limiting for reporting to prevent spam reports
export const reportRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // This would integrate with your existing rate limiting system
  // For now, just pass through
  next();
};

// Middleware to log moderation actions
export const logModerationAction = (action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Store original send method to capture response
    const originalSend = res.send;
    
    res.send = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info({
          action,
          userId: req.user?.id,
          path: req.path
        }, 'Moderation action');
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Content filtering middleware (pre-submission)
export const contentFilter = async (req: Request, res: Response, next: NextFunction) => {
  const content = req.body.content;
  
  if (!content || typeof content !== 'string') {
    return next();
  }
  
  // Basic content filtering
  const forbiddenPatterns = [
    /\b(?:password|login|account)\s*[:=]\s*\S+/gi, // Potential credential sharing
    /\b(?:phone|call|text)\s*(?:me|us)?\s*(?:at|on)?\s*[0-9\-\(\)\+\s]+/gi, // Phone number sharing
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // Email addresses
  ];
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      return res.status(400).json({
        error: 'Content contains potentially sensitive information',
        hint: 'Please avoid sharing personal contact information publicly'
      });
    }
  }
  
  // Check for extremely long content that might be spam
  if (content.length > 10000) {
    return res.status(400).json({
      error: 'Content exceeds maximum length',
      maxLength: 10000,
      currentLength: content.length
    });
  }
  
  // Check for excessive repetition
  const words = content.split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = 1 - (uniqueWords.size / words.length);
  
  if (words.length > 10 && repetitionRatio > 0.8) {
    return res.status(400).json({
      error: 'Content appears to be repetitive spam',
      hint: 'Please provide meaningful, varied content'
    });
  }
  
  next();
};

// Middleware to add content warnings
export const addContentWarnings = (req: Request, res: Response, next: NextFunction) => {
  // Store original send method
  const originalSend = res.send;
  
  res.send = function(data: any) {
    try {
      if (res.statusCode >= 200 && res.statusCode < 300 && data) {
        let parsedData;
        
        try {
          parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          return originalSend.call(this, data);
        }
        
        // Add content warnings to posts/comments based on content
        if (parsedData.post && parsedData.post.content) {
          const warnings = getContentWarnings(parsedData.post.content);
          if (warnings.length > 0) {
            parsedData.post.contentWarnings = warnings;
          }
        }
        
        if (parsedData.comment && parsedData.comment.content) {
          const warnings = getContentWarnings(parsedData.comment.content);
          if (warnings.length > 0) {
            parsedData.comment.contentWarnings = warnings;
          }
        }
        
        return originalSend.call(this, typeof data === 'string' ? JSON.stringify(parsedData) : parsedData);
      }
    } catch (error) {
      logger.error({ error }, 'Content warning middleware error');
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Helper function to detect content that needs warnings
function getContentWarnings(content: string): string[] {
  const warnings = [];
  const lowerContent = content.toLowerCase();
  
  // Political content warning
  const politicalKeywords = [
    'election', 'vote', 'candidate', 'democrat', 'republican',
    'liberal', 'conservative', 'politics', 'government', 'policy'
  ];
  
  if (politicalKeywords.some(keyword => lowerContent.includes(keyword))) {
    warnings.push('political_content');
  }
  
  // Sensitive topics
  const sensitiveTopics = [
    'violence', 'death', 'suicide', 'depression', 'anxiety',
    'mental health', 'trauma', 'abuse'
  ];
  
  if (sensitiveTopics.some(topic => lowerContent.includes(topic))) {
    warnings.push('sensitive_content');
  }
  
  return warnings;
}