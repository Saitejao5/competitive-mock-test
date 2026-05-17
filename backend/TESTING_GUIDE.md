# Quick Reference: Testing the Fixes

## 🚀 How to Verify the Fixes Are Working

### 1. Start the Backend Server
```bash
cd c:\Users\Dell\Downloads\exam-engine_1\exam-engine\backend
npm run dev
```

### 2. Watch for These Log Messages (copy-paste into search)

#### Success Indicators
```
[BATCH:getBatchForSection] INPUT PARAMS:
[BATCH:getBatchForSection] SECTION NORMALIZED:
[BATCH:findUnseenQuestions] QUERY FILTER:
[BATCH:findUnseenQuestions] RESULT COUNT:
[BATCH:getBatchForSection] ✓ SUCCESS:
```

#### Problem Indicators
```
[BATCH:findUnseenQuestions] RESULT COUNT: 0
[BATCH:findUnseenQuestions] ⚠️ EMPTY RESULT DEBUG:
[BATCH:createBatchWithLLM] ❌ ERROR:
```

---

## 📋 Complete Log Chain Examples

### Example 1: Questions Fetched Successfully
```
[BATCH:getBatchForSection] INPUT PARAMS: { 
  requestedSection: "Reasoning", 
  difficulty: "Easy", 
  limit: 25 
}
[BATCH:getBatchForSection] SECTION NORMALIZED: "Reasoning" → "Reasoning"
[BATCH:getBatchForSection] USER FOUND/CREATED: { userId: ..., seenQuestionsCount: 0 }
[BATCH:getBatchForSection] STEP 1 FETCH: Got 25/25 questions
[BATCH:getBatchForSection] ✓ SUCCESS: Serving 25 questions from 1 batch(es)
```
✅ **Status**: Working correctly

---

### Example 2: No Questions in Section
```
[BATCH:getBatchForSection] INPUT PARAMS: { requestedSection: "Physics" }
[BATCH:getBatchForSection] SECTION NORMALIZED: "Physics" → "Physics"
[BATCH:findUnseenQuestions] QUERY FILTER: { section: "Physics", difficulty: "Easy" }
[BATCH:findUnseenQuestions] RESULT COUNT: 0
[BATCH:findUnseenQuestions] ⚠️ EMPTY RESULT DEBUG: { 
  section: "Physics", 
  difficulty: "Easy",
  totalInSection: 0,
  unseenInSection: 0,
  seenQuestionsCount: 0
}
```
❌ **Problem**: No questions exist for section "Physics"
**Action**: Add questions to database

---

### Example 3: Difficulty Casing Mismatch
```
[BATCH:findUnseenQuestions] QUERY FILTER: { section: "Reasoning", difficulty: "Easy" }
[BATCH:findUnseenQuestions] RESULT COUNT: 0
[BATCH:findUnseenQuestions] ⚠️ EMPTY RESULT DEBUG: { 
  totalInSection: 50,
  unseenInSection: 50,
  actualDifficulties: ["easy", "medium", "hard"]
}
```
❌ **Problem**: Query uses "Easy" (uppercase) but DB has "easy" (lowercase)
**Action**: Run MongoDB query to verify actual values:
```javascript
db.questions.distinct('difficulty')
```

---

### Example 4: New Batch Creation
```
[BATCH:createBatchWithLLM] STARTING: section="Reasoning", difficulty="Easy"
[BATCH:createBatchWithLLM] Found 25 existing questions for deduplication
[BATCH:createBatchWithLLM] Generated batchId: "reasoning-easy-abc-123-def-456"
[GENERATOR] INPUT VALIDATION: { sectionName: "Reasoning", exam: "SSC CGL", difficulty: "Easy" }
[GENERATOR] LLM RESPONSE: 5234 chars from openrouter/gpt-4-mini
[VALIDATOR] SAMPLE VALIDATED QUESTION: { 
  question: "In a code, COMPUTER is written as RFUVQNPC...",
  options: ["A", "B", "C", "D"],
  correct: "A",
  explanation: "Each letter shifts...",
  topic: "Coding-Decoding",
  section: "Reasoning"
}
[VALIDATOR] Accepted: 25/25 questions for Reasoning
[BATCH:createBatchWithLLM] SAMPLE INSERT DOC: {
  question: "In a code, COMPUTER is written as RFUVQNPC...",
  options: ["A", "B", "C", "D"],
  correctAnswer: "A",          // ← Note: correctAnswer, not correct
  explanation: "Each letter shifts...",
  section: "Reasoning",
  topic: "Coding-Decoding",
  batchId: "reasoning-easy-abc-123-def-456",
  source: "llm",
  difficulty: "Easy",
  hash: "12345..."
}
[BATCH:createBatchWithLLM] INSERTING 25 documents...
[BATCH:createBatchWithLLM] Successfully inserted 25 documents
[BATCH:createBatchWithLLM] ✓ SUCCESS: Batch reasoning-easy-abc-123-def-456 created
```
✅ **Status**: Batch created successfully

---

## 🔍 Debugging Checklist

### Check 1: Is MongoDB Connected?
```
Look for this in startup logs:
[MONGO] Connected: exam-engine
```
If you don't see it, check:
- Is MongoDB running? (`mongosh` to test)
- Is MONGO_URI environment variable set?

---

### Check 2: Are Questions Being Generated?
```
Look for these logs:
[GENERATOR] INPUT VALIDATION:
[GENERATOR] LLM RESPONSE: ... chars from ...
[VALIDATOR] Accepted: X/Y questions
```
If you only see FALLBACK logs, LLM is failing - check:
- OPENROUTER_API_KEY environment variable
- Network connectivity to OpenRouter

---

### Check 3: Are Questions Being Fetched?
```
Look for:
[BATCH:findUnseenQuestions] RESULT COUNT: X
```
If it's 0, check the EMPTY RESULT DEBUG info:
- totalInSection > 0? → Data exists
- totalInSection = 0? → Database is empty

---

### Check 4: Are Field Names Correct?
```
Look for SAMPLE INSERT DOC and verify:
- ✅ correctAnswer: "A" (not "correct": "A")
- ✅ options: ["A", "B", "C", "D"]
- ✅ topic: "..." (not empty)
- ✅ section: "Reasoning"
- ✅ source: "db" or "llm"
```

---

## 📊 Log Search Patterns

### Find all database queries
```
grep "\[BATCH:findUnseenQuestions\]" server.log
```

### Find empty results
```
grep "RESULT COUNT: 0" server.log
```

### Find debugging info
```
grep "EMPTY RESULT DEBUG" server.log
```

### Find creation events
```
grep "\[BATCH:createBatchWithLLM\]" server.log
```

### Find LLM events
```
grep "\[GENERATOR\]" server.log
```

---

## 🧪 Manual Testing Steps

### Test 1: Basic Connectivity
```bash
curl http://localhost:3000/api/exam/config
# Should return: { exams: [...], sections: [...], difficulties: [...] }
```

### Test 2: Request Questions
```bash
curl -X POST http://localhost:3000/api/exam/generate-section \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "sectionName": "Reasoning",
    "exam": "SSC CGL",
    "difficulty": "Easy",
    "count": 5
  }'
```

**Expected Response**: Array of questions
```json
{
  "success": true,
  "sectionName": "Reasoning",
  "questions": [
    {
      "id": "...",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": "A",
      "explanation": "..."
    }
  ]
}
```

**Check Console For**: Debug logs showing the fetch process

---

## 🚨 Emergency Troubleshooting

### If you see no logs at all
1. Verify server is running: `npm run dev`
2. Check if console output is being captured
3. Restart server with fresh logs
4. Make a request to trigger logs

### If you see RESULT COUNT: 0 with no EMPTY RESULT DEBUG
1. This is old code - restart the server to get latest version
2. Check git status to verify changes were saved
3. Run `npm install` to ensure dependencies are up to date

### If you see truncated logs
1. Increase console buffer size
2. Use Winston/Pino logger for better output handling
3. Save logs to file: `npm run dev > server.log 2>&1`

---

## 📝 Log Levels Quick Reference

| Symbol | Type | Meaning | Action |
|--------|------|---------|--------|
| ℹ️ | INFO | Normal operation | Informational only |
| ✓ | SUCCESS | Operation worked | No action needed |
| ⚠️ | WARN | Potential issue | Investigate if repeated |
| ✗ | ERROR | Operation failed | Immediate action needed |
| 🔍 | DEBUG | Extra details | Use for troubleshooting |

---

## 🎯 What Each Log Section Tells You

### INPUT PARAMS Phase
**Tells you**: What parameters were sent to the function
**Example**:
```
INPUT PARAMS: { requestedSection: "Reasoning", difficulty: "Easy", limit: 25 }
```
**Check**: Are these the expected values?

---

### SECTION NORMALIZED Phase
**Tells you**: How the section name was transformed
**Example**:
```
SECTION NORMALIZED: "Quantitative Aptitude" → "Arithmetic"
```
**Check**: Is the output what you expect?

---

### USER FOUND/CREATED Phase
**Tells you**: Whether user tracking is working
**Example**:
```
USER FOUND/CREATED: { userId: ObjectId("..."), seenQuestionsCount: 0 }
```
**Check**: Is the user ID consistent? Does seenQuestionsCount increase?

---

### QUERY FILTER Phase
**Tells you**: The exact MongoDB query being executed
**Example**:
```
QUERY FILTER: { section: "Reasoning", difficulty: "Easy", _id: { $nin: [] } }
```
**Check**: Do these values match what's in the database?

---

### RESULT COUNT Phase
**Tells you**: How many documents matched the query
**Example**:
```
RESULT COUNT: 25
```
**Check**: Is this > 0? If 0, look for EMPTY RESULT DEBUG

---

### EMPTY RESULT DEBUG Phase
**Tells you**: Why a query returned empty (only if RESULT COUNT: 0)
**Example**:
```
EMPTY RESULT DEBUG: {
  totalInSection: 50,
  unseenInSection: 50,
  actualDifficulties: ["easy", "medium", "hard"]
}
```
**Insight**: 50 questions exist in section, but none with requested difficulty

---

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] See `[MONGO] Connected:` log
- [ ] Make a question request
- [ ] See `[BATCH:getBatchForSection] INPUT PARAMS:`
- [ ] See `[BATCH:findUnseenQuestions] RESULT COUNT: X` (where X > 0)
- [ ] See `[BATCH:getBatchForSection] ✓ SUCCESS:`
- [ ] Frontend receives questions
- [ ] Questions display correctly
- [ ] No console errors

---

## 💡 Performance Tips

1. **Watch RESULT COUNT times** - high latency = slow database
2. **Check for repeated empty results** - indicates data issue
3. **Monitor batchId generation** - should be unique
4. **Track LLM response times** - anything > 30s is slow
5. **Count insertMany calls** - shouldn't happen every request

---

**Created**: 2026-05-13
**Last Updated**: 2026-05-13
**For**: Backend Question Fetching
**Status**: ✅ Ready for Testing
