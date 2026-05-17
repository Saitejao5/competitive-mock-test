import 'dotenv/config';
import mongoose from 'mongoose';
import { Question } from './src/models/Question.js';
import { QuestionBatch } from './src/models/QuestionBatch.js';
import { User } from './src/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-engine';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(title, content = '', type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1];
  let color = colors.reset;
  let icon = '•';
  
  if (type === 'success') {
    color = colors.green;
    icon = '✓';
  } else if (type === 'error') {
    color = colors.red;
    icon = '✗';
  } else if (type === 'warn') {
    color = colors.yellow;
    icon = '⚠';
  } else if (type === 'info') {
    color = colors.blue;
    icon = 'ℹ';
  }
  
  console.log(`${color}[${timestamp}] ${icon} ${title}${colors.reset}${content ? ` ${content}` : ''}`);
}

async function runDebug() {
  try {
    // ═════════════════════════════════════════════════════════════
    // STEP 0: CONNECT TO MONGODB
    // ═════════════════════════════════════════════════════════════
    log('STEP 0: MONGODB CONNECTION', `Connecting to ${MONGODB_URI}...`, 'info');
    
    await mongoose.connect(MONGODB_URI);
    log('STEP 0: MONGODB CONNECTION', 'Connected ✓', 'success');

    // ═════════════════════════════════════════════════════════════
    // STEP 1: DATABASE HEALTH CHECK (MANDATORY)
    // ═════════════════════════════════════════════════════════════
    log('STEP 1: DATABASE HEALTH CHECK', 'Running: Question.find({})', 'info');
    
    const allQuestions = await Question.find({});
    log('STEP 1: DATABASE HEALTH CHECK', `Found ${allQuestions.length} total questions`, 
        allQuestions.length > 0 ? 'success' : 'warn');
    
    if (allQuestions.length === 0) {
      log('STEP 1: DATABASE HEALTH CHECK', '⚠️  Database is EMPTY! Data insertion is failing.', 'error');
    } else {
      log('STEP 1: DATABASE HEALTH CHECK', `Sample document:`, 'info');
      const sample = allQuestions[0];
      console.log(JSON.stringify(sample, null, 2));
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 2: ISOLATION TEST - STEP BY STEP
    // ═════════════════════════════════════════════════════════════
    log('\nSTEP 2: ISOLATION TEST', 'Testing filters progressively...', 'info');

    // Get unique values from database
    const sections = await Question.distinct('section');
    const difficulties = await Question.distinct('difficulty');
    const sources = await Question.distinct('source');
    const batchIds = await Question.distinct('batchId');

    log('STEP 2: UNIQUE VALUES', `Sections: ${JSON.stringify(sections)}`, 'info');
    log('STEP 2: UNIQUE VALUES', `Difficulties: ${JSON.stringify(difficulties)}`, 'info');
    log('STEP 2: UNIQUE VALUES', `Sources: ${JSON.stringify(sources)}`, 'info');
    log('STEP 2: UNIQUE VALUES', `Sample BatchIds: ${JSON.stringify(batchIds.slice(0, 3))}`, 'info');

    if (sections.length === 0) {
      log('STEP 2: ISOLATION TEST', '⚠️  No sections found in database!', 'warn');
      await mongoose.disconnect();
      return;
    }

    // Test 1: Find all
    const test1 = await Question.find({});
    log('STEP 2: TEST 1 - find({})', `${test1.length} results`, test1.length > 0 ? 'success' : 'error');

    // Test 2: Find by section
    const testSection = sections[0];
    log('STEP 2: TEST 2', `Testing section filter: "${testSection}"`, 'info');
    const test2 = await Question.find({ section: testSection });
    log('STEP 2: TEST 2 - find({section})', `${test2.length} results for "${testSection}"`, 
        test2.length > 0 ? 'success' : 'error');

    if (test2.length === 0) {
      log('STEP 2: TEST 2', `⚠️  PROBLEM AT SECTION FILTER!`, 'error');
      log('STEP 2: TEST 2', `Expected section: "${testSection}"`, 'info');
      log('STEP 2: TEST 2', `Available sections in DB: ${JSON.stringify(sections)}`, 'warn');
    }

    // Test 3: Find by section + difficulty
    if (difficulties.length > 0) {
      const testDifficulty = difficulties[0];
      log('STEP 2: TEST 3', `Testing section + difficulty: "${testSection}" + "${testDifficulty}"`, 'info');
      const test3 = await Question.find({ section: testSection, difficulty: testDifficulty });
      log('STEP 2: TEST 3 - find({section, difficulty})', `${test3.length} results`, 
          test3.length > 0 ? 'success' : 'error');

      if (test3.length === 0) {
        log('STEP 2: TEST 3', `⚠️  PROBLEM AT DIFFICULTY FILTER!`, 'error');
        log('STEP 2: TEST 3', `Expected difficulty: "${testDifficulty}"`, 'info');
        
        // Check if it's a casing issue
        const sectionDocs = await Question.find({ section: testSection });
        if (sectionDocs.length > 0) {
          const actualDifficulties = [...new Set(sectionDocs.map(q => q.difficulty))];
          log('STEP 2: TEST 3', `Actual difficulties in DB for this section: ${JSON.stringify(actualDifficulties)}`, 'warn');
        }
      }
    }

    // Test 4: Find by section + difficulty + batchId
    if (batchIds.length > 0 && difficulties.length > 0) {
      const testBatchId = batchIds[0];
      const testDifficulty = difficulties[0];
      log('STEP 2: TEST 4', `Testing section + difficulty + batchId: "${testSection}" + "${testDifficulty}" + "${testBatchId}"`, 'info');
      const test4 = await Question.find({ section: testSection, difficulty: testDifficulty, batchId: testBatchId });
      log('STEP 2: TEST 4 - find({section, difficulty, batchId})', `${test4.length} results`, 
          test4.length > 0 ? 'success' : 'error');

      if (test4.length === 0) {
        log('STEP 2: TEST 4', `⚠️  PROBLEM AT BATCHID FILTER!`, 'error');
      }
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 3: CHECK COMMON ROOT CAUSES
    // ═════════════════════════════════════════════════════════════
    log('\nSTEP 3: COMMON ROOT CAUSES', 'Checking for typical issues...', 'info');

    const sample = allQuestions[0];
    if (sample) {
      // Check field names
      log('STEP 3: FIELD NAMES', `Question has: ${Object.keys(sample).join(', ')}`, 'info');
      
      if (!sample.correctAnswer && sample.correct) {
        log('STEP 3: FIELD MAPPING', '⚠️  Schema expects "correctAnswer" but data has "correct"!', 'error');
      }
      
      if (!sample.section || sample.section === '') {
        log('STEP 3: SECTION', '⚠️  "section" field is empty or missing!', 'error');
      }
      
      if (!sample.difficulty || sample.difficulty === '') {
        log('STEP 3: DIFFICULTY', '⚠️  "difficulty" field is empty or missing!', 'error');
      }
      
      if (!sample.batchId || sample.batchId === '') {
        log('STEP 3: BATCHID', '⚠️  "batchId" field is empty or missing!', 'error');
      }
      
      if (!sample.source || sample.source === '') {
        log('STEP 3: SOURCE', '⚠️  "source" field is empty or missing!', 'error');
      } else {
        log('STEP 3: SOURCE', `Source values: ${JSON.stringify(sources)}`, 'info');
      }
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 4: SCHEMA VERIFICATION
    // ═════════════════════════════════════════════════════════════
    log('\nSTEP 4: SCHEMA VERIFICATION', 'Checking Question schema...', 'info');
    
    const schemaFields = Object.keys(Question.schema.paths);
    log('STEP 4: SCHEMA FIELDS', `${schemaFields.join(', ')}`, 'info');
    
    const requiredFields = Object.keys(Question.schema.paths)
      .filter(field => Question.schema.paths[field].isRequired)
      .sort();
    log('STEP 4: REQUIRED FIELDS', `${requiredFields.join(', ')}`, 'info');

    // ═════════════════════════════════════════════════════════════
    // STEP 5: BATCH SERVICE ANALYSIS
    // ═════════════════════════════════════════════════════════════
    log('\nSTEP 5: BATCH SERVICE ANALYSIS', 'Checking QuestionBatch collection...', 'info');
    
    const batches = await QuestionBatch.find({});
    log('STEP 5: BATCHES COUNT', `Found ${batches.length} batches`, 'info');
    
    if (batches.length > 0) {
      const batchSample = batches[0];
      log('STEP 5: BATCH SAMPLE', `Batch: ${batchSample.batchId}`, 'info');
      log('STEP 5: BATCH SAMPLE', `Section: ${batchSample.section}, Difficulty: ${batchSample.difficulty}, Questions: ${batchSample.questionIds.length}`, 'info');
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 6: FINAL SUMMARY
    // ═════════════════════════════════════════════════════════════
    log('\nSTEP 6: FINAL SUMMARY', '', 'info');
    console.log(`
┌──────────────────────────────────────────┐
│     MONGODB DEBUG SUMMARY REPORT         │
├──────────────────────────────────────────┤
│ Total Questions:        ${String(allQuestions.length).padEnd(25)} │
│ Total Batches:          ${String(batches.length).padEnd(25)} │
│ Unique Sections:        ${String(sections.length).padEnd(25)} │
│ Unique Difficulties:    ${String(difficulties.length).padEnd(25)} │
│ Unique Sources:         ${String(sources.length).padEnd(25)} │
│ Unique BatchIds:        ${String(batchIds.length).padEnd(25)} │
└──────────────────────────────────────────┘
    `);

    if (allQuestions.length === 0) {
      log('SUMMARY: ROOT CAUSE', 'DATABASE IS EMPTY - Insert/Schema validation failing', 'error');
    } else if (test2.length === 0) {
      log('SUMMARY: ROOT CAUSE', 'Section filter failed - Section values mismatch', 'error');
    } else if (difficulties.length > 0 && test3?.length === 0) {
      log('SUMMARY: ROOT CAUSE', 'Difficulty filter failed - Casing or value mismatch', 'error');
    } else {
      log('SUMMARY: ROOT CAUSE', 'Queries working - Issue is in application logic', 'success');
    }

  } catch (err) {
    log('ERROR', err.message, 'error');
    console.error(err);
  } finally {
    await mongoose.disconnect();
    log('CLEANUP', 'Disconnected from MongoDB', 'info');
  }
}

// Run the debug script
console.log('\n' + '═'.repeat(50));
console.log('MONGODB + MONGOOSE DEBUGGING AGENT');
console.log('═'.repeat(50) + '\n');

runDebug().catch(console.error);
