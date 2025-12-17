/**
 * Prisma Configuration File
 * Required for Prisma 7.x - manages database connection configuration
 *
 * Created: December 2025
 * Purpose: Centralize Prisma configuration outside of schema.prisma
 */

import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
