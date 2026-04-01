import cron from 'node-cron';
import { Child, Family } from '@/lib/db/models';
import { generateWeeklyHighlight, generateMonthlyRecap } from '@/lib/services/highlight-generator';
import connectDB from '@/lib/db/mongoose';

/**
 * 🤖 AUTOMATED HIGHLIGHT GENERATION
 *
 * Schedule:
 * - Weekly Highlights: Every Monday at 8 AM
 * - Monthly Recaps: 1st of each month at 9 AM
 */

/**
 * Generate weekly highlights for all active children
 * Runs every Monday at 8:00 AM
 */
export function scheduleWeeklyHighlights() {
  // Every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    try {
      console.log('🎬 Starting weekly highlight generation...');

      await connectDB();

      // Get all families
      const families = await Family.find();

      let successCount = 0;
      let failCount = 0;

      for (const family of families) {
        // For each child in the family
        for (const childId of family.childrenIds) {
          try {
            // Calculate last week's date range
            const now = new Date();
            const weekEnd = new Date(now);
            weekEnd.setDate(now.getDate() - now.getDay()); // Last Sunday

            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 6); // Monday of last week

            // Set times
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(23, 59, 59, 999);

            console.log(`📸 Generating weekly highlight for child ${childId}...`);

            await generateWeeklyHighlight({
              childId,
              familyId: family._id,
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
            });

            successCount++;
            console.log(`✅ Weekly highlight created for child ${childId}`);

            // Small delay to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (error: any) {
            failCount++;
            console.error(`❌ Failed to generate highlight for child ${childId}:`, error.message);
          }
        }
      }

      console.log(`🎉 Weekly highlight generation complete: ${successCount} succeeded, ${failCount} failed`);
    } catch (error) {
      console.error('❌ Weekly highlight cron job failed:', error);
    }
  });

  console.log('✅ Weekly highlight cron job scheduled (Every Monday 8 AM)');
}

/**
 * Generate monthly recaps for all active children
 * Runs on the 1st of each month at 9:00 AM
 */
export function scheduleMonthlyRecaps() {
  // 1st day of month at 9:00 AM
  cron.schedule('0 9 1 * *', async () => {
    try {
      console.log('📅 Starting monthly recap generation...');

      await connectDB();

      const families = await Family.find();

      let successCount = 0;
      let failCount = 0;

      // Calculate last month
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      for (const family of families) {
        for (const childId of family.childrenIds) {
          try {
            console.log(`📊 Generating monthly recap for child ${childId}...`);

            await generateMonthlyRecap({
              childId,
              familyId: family._id,
              month: lastMonth,
              year,
            });

            successCount++;
            console.log(`✅ Monthly recap created for child ${childId}`);

            // Delay to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } catch (error: any) {
            failCount++;
            console.error(`❌ Failed to generate recap for child ${childId}:`, error.message);
          }
        }
      }

      console.log(`🎉 Monthly recap generation complete: ${successCount} succeeded, ${failCount} failed`);
    } catch (error) {
      console.error('❌ Monthly recap cron job failed:', error);
    }
  });

  console.log('✅ Monthly recap cron job scheduled (1st of month 9 AM)');
}

/**
 * Start all automated highlight generation jobs
 */
export function startHighlightJobs() {
  console.log('🚀 Starting automated highlight generation jobs...');

  scheduleWeeklyHighlights();
  scheduleMonthlyRecaps();

  console.log('✅ All highlight jobs scheduled successfully');
}

// Manual trigger functions for testing/admin
export async function triggerWeeklyHighlightNow(childId: string, familyId: string) {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() - now.getDay());

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);

  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);

  return generateWeeklyHighlight({
    childId: new (require('mongoose').Types.ObjectId)(childId),
    familyId: new (require('mongoose').Types.ObjectId)(familyId),
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
  });
}

export async function triggerMonthlyRecapNow(childId: string, familyId: string, month?: number, year?: number) {
  const now = new Date();
  const targetMonth = month || (now.getMonth() === 0 ? 12 : now.getMonth());
  const targetYear = year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  return generateMonthlyRecap({
    childId: new (require('mongoose').Types.ObjectId)(childId),
    familyId: new (require('mongoose').Types.ObjectId)(familyId),
    month: targetMonth,
    year: targetYear,
  });
}
