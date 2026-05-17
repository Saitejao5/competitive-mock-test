# MongoDB + Mongoose Debugging Guide

## 🎯 Issues Fixed

### Issue 1: Missing Debug Logging (CRITICAL)
**Problem**: `findUnseenQuestions()` queries returned empty results silently with no insight into why.

**Impact**: 
- Silent failures make debugging impossible
- Developers can't tell if query is wrong or data is missing
- No way to distinguish between "no data" and "wrong filter"

**Solution Applied**:
```javascript
// Before query:
console.log(`[BATCH:findUnseenQuestions] QUERY FILTER:`, {
  section,
  difficulty,
  seenQuestionsCount: seenQuestionIds.length,
  limit,
  filter: JSON.stringify(filter)
});

// After query:
console.log(`[BATCH:findUnseenQuestions] RESULT COUNT: ${results.length}`, {
  section,
  difficulty,
  expectedLimit: limit,
  returned: results.length
});

// If empty, debug why:
if (results.length === 0) {
  const allInSection = await Question.countDocuments({ section });
  const seenInSection = await Question.countDocuments({ 
    section, 
    _id: { $in: seenQuestionIds } 
  });
  console.log(`[BATCH:findUnseenQuestions] ⚠️  EMPTY RESULT DEBUG:`, {
    section,
    difficulty,
    totalInSection: allInSection,
    seenInSection,
    unseenInSection: allInSection - seenInSection,
  });
}
```

**Key Metrics Now Logged**:
- Query filter parameters
- Result count vs expected limit
- Total questions in section
- Seen vs unseen question counts

---

### Issue 2: No Insert Data Validation Logging
**Problem**: When `Question.insertMany()` fails, developers don't see sample data or schema mismatch errors.

**Impact**:
- Silent insertion failures
- No visibility into why documents are rejected
- Can't verify schema compliance

**Solution Applied**:
```javascript
// Log sample document before insert:
console.log(`[BATCH:createBatchWithLLM] SAMPLE INSERT DOC:`, 
  JSON.stringify(docs[0], null, 2)
);

// Log insertion results:
console.log(`[BATCH:createBatchWithLLM] Successfully inserted ${inserted.length} documents`);

// Handle partial failures:
await Question.insertMany(uniqueDocs, { ordered: false }).catch(err => {
  console.log(`[BATCH:createBatchWithLLM] ⚠️  insertMany error:`, err.message);
  if (err?.insertedDocs?.length) {
    console.log(`[BATCH:createBatchWithLLM] Recovered ${err.insertedDocs.length} inserted docs`);
    return err.insertedDocs;
  }
  throw err;
});
```

---

### Issue 3: Section Name Normalization Mismatch
**Problem**: Frontend sends "Arithmetic" but database has "Quantitative Aptitude", or vice versa.

**Debugging Steps**:
1. Check logs for `SECTION NORMALIZED` line showing input → output
2. If normalized section doesn't match DB data, update `SECTION_ALIASES` in `batchService.js`
3. Query distinct sections: `db.questions.distinct('section')`

**Current Aliases**:
```javascript
const SECTION_ALIASES = {
  'quantitative aptitude': 'Arithmetic',
  mathematics: 'Arithmetic',
  reasoning: 'Reasoning',
  'reasoning ability': 'Reasoning',
  english: 'English',
  'english language': 'English',
  gk: 'GK',
  'general knowledge': 'GK',
};
```

---

### Issue 4: Difficulty Casing Mismatch
**Problem**: Query uses `difficulty: "Easy"` but DB has `difficulty: "easy"`.

**How to Detect**:
Look for logs showing:
```
QUERY FILTER: { section: "Reasoning", difficulty: "Easy" }
RESULT COUNT: 0
EMPTY RESULT DEBUG: totalInSection: 50, unseenInSection: 50
```
This means section exists but difficulty filter fails.

**Fix**:
1. Check actual difficulty values in DB:
```javascript
const difficulties = await Question.distinct('difficulty');
console.log('Actual values:', difficulties);
```
2. Ensure consistency in generation and querying

---

### Issue 5: No Input Parameter Validation Logging
**Problem**: `getBatchForSection()` called with invalid parameters - no one can see what was passed in.

**Solution Applied**:
```javascript
console.log(`[BATCH:getBatchForSection] INPUT PARAMS:`, {
  userKey: userKey?.substring(0, 20) + '...' || 'undefined',
  requestedSection,
  exam,
  difficulty,
  limit,
  allowSynchronousRefill
});

// And later:
console.log(`[BATCH:getBatchForSection] SECTION NORMALIZED: "${requestedSection}" → "${section}"`);
console.log(`[BATCH:getBatchForSection] USER FOUND/CREATED:`, {
  userId: user._id,
  seenQuestionsCount: user.seenQuestionIds?.length || 0
});
```

---

### Issue 6: Silent LLM Generation Failures
**Problem**: Question generation fails but the error is buried in logs.

**Solution Applied**:
```javascript
console.log(`[GENERATOR] ATTEMPT ${attempt} of ${MAX_VALIDATION_RETRIES}`);
console.log(`[GENERATOR] PARSED QUESTIONS: ${questions.length} valid questions`);

if (questions.length < Math.ceil(count * 0.5)) {
  console.log(`[GENERATOR] BELOW THRESHOLD (${Math.ceil(count * 0.5)}): Retrying...`);
}

if (questions.length === 0) {
  console.log(`[GENERATOR] ALL ATTEMPTS FAILED - Using fallback`);
}
```

---

### Issue 7: Missing Topic Default
**Problem**: Questions without a topic value cause schema validation to fail.

**Schema Updated**:
```javascript
topic: { type: String, default: 'general' }  // Was: default: ''
```

---

## 📋 Step-by-Step Debugging Checklist

### STEP 1: Check Database Connection
```bash
# Verify MongoDB is running
mongosh

# Check if questions exist
db.questions.count()
```

**Expected Result**: Should return a number > 0

---

### STEP 2: Enable Debug Logging
Look for these log lines in server output:

```
[BATCH:getBatchForSection] INPUT PARAMS: { ... }
[BATCH:getBatchForSection] SECTION NORMALIZED: "Reasoning" → "Reasoning"
[BATCH:findUnseenQuestions] QUERY FILTER: { ... }
[BATCH:findUnseenQuestions] RESULT COUNT: X
```

**What Each Line Tells You**:
- INPUT PARAMS: Confirms what request was sent
- SECTION NORMALIZED: Confirms section name mapping
- QUERY FILTER: Exact MongoDB query being executed
- RESULT COUNT: How many questions returned

---

### STEP 3: Identify Break Point
If RESULT COUNT = 0, run these queries to find which filter fails:

```javascript
// Test 1: No filters
Question.countDocuments({})  // Should be > 0

// Test 2: Section filter only
Question.countDocuments({ section: "Reasoning" })

// Test 3: Section + Difficulty
Question.countDocuments({ 
  section: "Reasoning", 
  difficulty: "Easy" 
})

// Test 4: Section + Difficulty + Source
Question.countDocuments({ 
  section: "Reasoning", 
  difficulty: "Easy",
  source: "db"
})
```

**Stop at the query that returns 0** - that's your root cause.

---

### STEP 4: Check Unique Values in DB
```javascript
// What sections exist?
db.questions.distinct('section')

// What difficulties exist?
db.questions.distinct('difficulty')

// What sources exist?
db.questions.distinct('source')

// Any questions exist at all?
db.questions.findOne()  // Should show sample document
```

---

### STEP 5: Verify Schema Compliance
Sample document should have:
```javascript
{
  _id: ObjectId(...),
  question: "The question text...",
  options: ["A", "B", "C", "D"],
  correctAnswer: "A",  // NOT "correct"
  explanation: "...",
  section: "Reasoning",  // Should match DB values
  topic: "Logic Gates",  // Should not be empty
  batchId: "reasoning-easy-xxx",
  source: "llm",  // 'db' or 'llm' only
  difficulty: "Easy",  // Should match queries
  hash: "12345...",
  createdAt: Date,
  updatedAt: Date
}
```

**Common Issues**:
- ❌ `correct` instead of `correctAnswer`
- ❌ `topic: ""` or missing
- ❌ `section: undefined`
- ❌ `difficulty` has wrong casing
- ❌ `source` not in ['db', 'llm']

---

## 🔍 Log Output Interpretation

### Example: Good Scenario
```
[BATCH:getBatchForSection] INPUT PARAMS: { requestedSection: "Reasoning", difficulty: "Easy", limit: 25 }
[BATCH:getBatchForSection] SECTION NORMALIZED: "Reasoning" → "Reasoning"
[BATCH:getBatchForSection] USER FOUND/CREATED: { userId: ObjectId(...), seenQuestionsCount: 0 }
[BATCH:findUnseenQuestions] QUERY FILTER: { section: "Reasoning", difficulty: "Easy", _id: { $nin: [] } }
[BATCH:findUnseenQuestions] RESULT COUNT: 25
[BATCH:getBatchForSection] ✓ SUCCESS: Serving 25 questions from 1 batch(es)
```
✅ **Status**: All questions fetched successfully

---

### Example: Bad Scenario - Section Mismatch
```
[BATCH:getBatchForSection] INPUT PARAMS: { requestedSection: "Arithmetic", difficulty: "Easy", limit: 25 }
[BATCH:getBatchForSection] SECTION NORMALIZED: "Arithmetic" → "Arithmetic"
[BATCH:findUnseenQuestions] QUERY FILTER: { section: "Arithmetic", difficulty: "Easy", _id: { $nin: [] } }
[BATCH:findUnseenQuestions] RESULT COUNT: 0
[BATCH:findUnseenQuestions] ⚠️  EMPTY RESULT DEBUG: { totalInSection: 0, unseenInSection: 0 }
```
❌ **Root Cause**: No documents with section="Arithmetic"
**Fix**: Check what sections actually exist in DB

---

### Example: Bad Scenario - Difficulty Mismatch
```
[BATCH:findUnseenQuestions] QUERY FILTER: { section: "Reasoning", difficulty: "Easy", _id: { $nin: [] } }
[BATCH:findUnseenQuestions] RESULT COUNT: 0
[BATCH:findUnseenQuestions] ⚠️  EMPTY RESULT DEBUG: { 
  totalInSection: 50, 
  unseenInSection: 50,  // Questions exist!
  actualDifficulties: ["easy", "medium", "hard"]  // Lowercase!
}
```
❌ **Root Cause**: Query uses "Easy" but DB has "easy" (casing mismatch)
**Fix**: Update query or normalize on insert

---

## 🛠️ Common Fixes

### Fix 1: Add Missing Section to SECTION_ALIASES
```javascript
const SECTION_ALIASES = {
  'your section name': 'canonical_section_name',
  // ...existing aliases
};
```

### Fix 2: Normalize Difficulty Values on Insert
```javascript
const docs = usable.map(question => ({
  // ...
  difficulty: difficulty.toLowerCase(),  // Ensure lowercase
  // ...
}));
```

### Fix 3: Ensure Topic Has Default
```javascript
// In schema:
topic: { type: String, default: 'general' }

// In insert:
topic: question.topic || section,
```

### Fix 4: Verify correctAnswer Field
```javascript
// Correct:
correctAnswer: question.correct

// Incorrect (will fail):
correct: question.correct
```

---

## 📊 Performance Logging

The logs now show:
- Query execution parameters
- Result counts at each step
- Section normalization mapping
- User creation/lookup
- Batch creation details
- LLM generation progress
- Schema compliance checks

**Use these to identify bottlenecks**:
1. If findUnseenQuestions is slow, check index: `{ section: 1, difficulty: 1, createdAt: 1 }`
2. If insertMany is slow, check for hash collisions
3. If LLM generation times out, increase timeout or check API

---

## 🚨 Emergency Debugging

If nothing works, run these queries directly:

```javascript
// 1. Check if MongoDB is connected
mongoose.connection.readyState  // Should be 1

// 2. Count all questions
await Question.countDocuments({})

// 3. Show all distinct section values
await Question.distinct('section')

// 4. Show all distinct difficulty values
await Question.distinct('difficulty')

// 5. Get one sample document
await Question.findOne({})

// 6. Check if indexes exist
db.questions.getIndexes()

// 7. Rebuild indexes
db.questions.reIndex()
```

---

## ✅ Validation Checklist

Before deployment:
- [ ] MongoDB is running and accessible
- [ ] MONGO_URI environment variable is set
- [ ] All sections in queries match SECTION_ALIASES
- [ ] Difficulty values are consistent (case-wise)
- [ ] Topic field never empty (has default)
- [ ] correctAnswer field exists (not `correct`)
- [ ] All indexes are created
- [ ] Sample questions exist in DB
- [ ] Batch service logs show successful fetches
- [ ] No silent errors in logs

---

## 📝 Schema Reference

```javascript
{
  question: String (required),
  options: [String] (exactly 4, required),
  correctAnswer: 'A'|'B'|'C'|'D' (required),
  explanation: String (default: 'No explanation provided.'),
  section: String (required, indexed),
  topic: String (default: 'general'),
  batchId: String (required, indexed),
  source: 'db'|'llm' (default: 'db', indexed),
  difficulty: String (required, indexed),
  hash: String (required, unique, indexed),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- section: 1, difficulty: 1, batchId: 1
- section: 1, difficulty: 1, createdAt: 1
- section: 1, difficulty: 1, source: 1
- question: 1
```

---

## 🎓 Learning Resources

### Key Concepts
1. **Silent Failures**: Always log query parameters and results
2. **Field Mapping**: Be explicit about schema field names
3. **Normalization**: Document all value transformations
4. **Defaults**: Provide sensible defaults for optional fields
5. **Validation**: Log validation errors, not just successes

### Best Practices
- Always log before/after database operations
- Include timestamps in logs
- Use consistent prefixes ([SERVICE:FUNCTION])
- Log query parameters, not just results
- Debug empty results immediately
