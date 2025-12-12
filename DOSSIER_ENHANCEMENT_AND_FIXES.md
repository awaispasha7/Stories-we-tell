# Dossier Enhancement & Critical Fixes
## Implementation Plan for Client Requirements

**Date:** December 2025  
**Document Purpose:** Address dossier structure enhancements, human-in-the-loop integration, and fix critical UX issues.

---

## Executive Summary

This document addresses:
1. **Dossier Structure Enhancement** - Expand to support client's detailed character requirements
2. **Human-in-the-Loop Integration** - Proper multi-stage validation workflow
3. **Critical UX Fixes** - Loader blocking, state synchronization, story completion restrictions

---

## Part 1: Dossier Structure Enhancement

### Current Dossier Structure (snapshot_json)

**Current Fields:**
```json
{
  "title": "Julia and Anderson",
  "logline": "...",
  "runtime": "3-5 minutes",
  "characters": [
    {
      "name": "Julia",
      "role": "protagonist",
      "description": "A literature teacher..."
    }
  ],
  "scenes": [...],
  "story_location": "Evermere, Oregon",
  "story_timeframe": "Autumn 1997",
  "story_world_type": "Real",
  "problem_statement": "...",
  "actions_taken": "...",
  "outcome": "...",
  "subject_full_name": "Julia",
  "subject_brief_description": "...",
  "subject_exists_real_world": true,
  "subject_relationship_to_writer": "Unknown",
  "writer_connection_place_time": "Unknown"
}
```

### Required Enhancements (Per Client Requirements)

**Missing Fields:**
1. **Character Details:**
   - `age_at_story_time` (number)
   - `physical_descriptors` (array of strings)
   - `personality_traits` (array of strings)
   - `photo_asset_ids` (array of UUIDs - link to uploaded photos)

2. **Second Hero Support:**
   - `hero_2` (object with same structure as hero_1)
   - Or restructure to `heroes[]` array

3. **Supporting Characters:**
   - `supporting_characters[]` (array, up to 2)
   - Each with: name, role, light_description, photo_asset_ids

4. **Story Metadata:**
   - `story_type` (romantic, childhood_drama, fantasy, epic, adventure, historic_action, documentary, other)
   - `season` (spring, summer, fall, winter)
   - `environmental_details` (string - natural language)
   - `audience` (who will see this first)
   - `emotional_intent` (what do you want them to feel)
   - `narrative_perspective` (first_person, narrator_voice, legend_myth_tone, documentary_tone)

5. **Workflow Status:**
   - `workflow_stage` (intake, review_1_pending, synopsis_generated, review_2_pending, script_generated, review_3_pending, ready_for_vlm, completed)
   - `validation_status` (pending, approved, rejected, needs_revision)
   - `last_reviewed_by` (user_id of reviewer)
   - `last_reviewed_at` (timestamp)

### Enhanced Dossier Schema

```json
{
  "title": "Julia and Anderson",
  "logline": "...",
  "runtime": "3-5 minutes",
  
  // Enhanced Character Structure
  "heroes": [
    {
      "name": "Julia",
      "age_at_story_time": 32,
      "relationship_to_writer": "friend",
      "physical_descriptors": ["tall", "brown hair", "warm eyes"],
      "personality_traits": ["thoughtful", "introspective", "empathetic"],
      "photo_asset_ids": ["uuid-1", "uuid-2"],
      "role": "protagonist"
    },
    {
      "name": "Anderson",
      "age_at_story_time": 35,
      "relationship_to_writer": "friend",
      "physical_descriptors": ["average height", "dark hair"],
      "personality_traits": ["steady", "loyal"],
      "photo_asset_ids": ["uuid-3"],
      "role": "protagonist"
    }
  ],
  
  "supporting_characters": [
    {
      "name": "Sarah",
      "role": "supporting",
      "light_description": "Julia's colleague",
      "photo_asset_ids": []
    }
  ],
  
  // Enhanced Story Metadata
  "story_location": "Evermere, Oregon",
  "story_timeframe": "Autumn 1997",
  "season": "autumn",
  "story_world_type": "Real",
  "environmental_details": "Small coastal town with misty mornings and quiet streets",
  "story_type": "romantic",
  "audience": "family and close friends",
  "emotional_intent": "nostalgia and hope",
  "narrative_perspective": "narrator_voice",
  
  // Story Content
  "problem_statement": "...",
  "actions_taken": "...",
  "outcome": "...",
  "scenes": [...],
  
  // Workflow Status
  "workflow_stage": "intake",
  "validation_status": "pending",
  "last_reviewed_by": null,
  "last_reviewed_at": null
}
```

### Database Migration

```sql
-- No schema change needed - snapshot_json is JSONB and flexible
-- But we should add indexes for workflow queries

CREATE INDEX IF NOT EXISTS idx_dossier_workflow_stage 
ON public.dossier USING btree ((snapshot_json->>'workflow_stage'));

CREATE INDEX IF NOT EXISTS idx_dossier_validation_status 
ON public.dossier USING btree ((snapshot_json->>'validation_status'));
```

---

## Part 2: Human-in-the-Loop Integration

### Current State

**Single Validation Stage:**
- Admin reviews script after generation
- Happens at wrong time (after script, not before synopsis)

### Required Multi-Stage Validation

**Stage 1: Intake Data Review (Step 9)**
- **Trigger:** After user completes chatbot intake
- **Reviewer:** SWT Representative
- **Review Items:**
  - Character logic (age, relationships make sense)
  - Photos (quality, relevance)
  - Timeline (consistent dates)
  - Setting (complete details)
  - Tone & perspective (clear)
- **Actions:**
  - Fix missing info
  - Resolve conflicts
  - Fill factual gaps
- **Outcome:** Data clarity before synopsis generation

**Stage 2: Synopsis Review (Step 11)**
- **Trigger:** After synopsis generation
- **Reviewer:** SWT Representative
- **Review Items:**
  - Emotional tone
  - Accuracy vs intake
  - Clarity
  - Perspective
  - Pacing
  - Sensitivity
- **Actions:**
  - Approve → proceed to script
  - Reject → revision loop (back to synopsis generation with feedback)
- **Outcome:** Locked synopsis ready for script generation

**Stage 3: Full Script Package Review (Step 19)**
- **Trigger:** After all script components generated
- **Reviewer:** SWT Representative
- **Review Items:**
  - Script
  - Dialogue
  - Voice-over
  - Shot list
  - Camera logic
  - Micro-prompts
- **Actions:**
  - Approve → ready for VLM
  - Reject → edit text before visuals
- **Outcome:** Complete package ready for visual generation

### Implementation Architecture

#### 1. Validation Queue Enhancement

**Current Table:** `validation_queue`
- Only handles script validation
- Single stage

**Enhanced Structure:**
```sql
-- Add new fields to validation_queue
ALTER TABLE validation_queue 
ADD COLUMN IF NOT EXISTS validation_stage VARCHAR(50) DEFAULT 'script_review',
ADD COLUMN IF NOT EXISTS synopsis TEXT,
ADD COLUMN IF NOT EXISTS synopsis_feedback TEXT,
ADD COLUMN IF NOT EXISTS intake_data JSONB,
ADD COLUMN IF NOT EXISTS intake_feedback TEXT,
ADD COLUMN IF NOT EXISTS script_package JSONB, -- Contains all script components
ADD COLUMN IF NOT EXISTS script_package_feedback TEXT;

-- Add index for stage-based queries
CREATE INDEX IF NOT EXISTS idx_validation_queue_stage 
ON validation_queue(validation_stage, status);
```

**Validation Stages:**
- `intake_review` - Review #1
- `synopsis_review` - Review #2
- `script_review` - Review #3 (current)

#### 2. Workflow State Machine

**States:**
```
intake_complete
  → review_1_pending
  → review_1_approved → synopsis_generation
  → review_1_rejected → intake_revision
  
synopsis_generated
  → review_2_pending
  → review_2_approved → script_generation
  → review_2_rejected → synopsis_revision (loop)
  
script_generated
  → review_3_pending
  → review_3_approved → ready_for_vlm
  → review_3_rejected → script_revision
```

#### 3. Admin Dashboard Enhancement

**New Sections:**
1. **Intake Review Queue** (`/admin/intake-review`)
   - List projects with `workflow_stage = 'review_1_pending'`
   - Show character data, photos, timeline, setting
   - Approve/Reject with feedback

2. **Synopsis Review Queue** (`/admin/synopsis-review`)
   - List projects with `workflow_stage = 'review_2_pending'`
   - Show synopsis, compare with intake
   - Approve/Reject with feedback

3. **Script Review Queue** (`/admin/script-review`) - Existing
   - Enhanced to show all script components
   - Review script, dialogue, VO, shot list, camera logic, micro-prompts

#### 4. Backend API Changes

**New Endpoints:**
```python
# Intake Review
POST /api/v1/validation/intake-review/{project_id}/approve
POST /api/v1/validation/intake-review/{project_id}/reject

# Synopsis Review
POST /api/v1/validation/synopsis-review/{project_id}/approve
POST /api/v1/validation/synopsis-review/{project_id}/reject

# Script Review (enhanced)
POST /api/v1/validation/script-review/{project_id}/approve
POST /api/v1/validation/script-review/{project_id}/reject
```

**Modified Endpoints:**
```python
# Update chat completion flow
# After intake complete → queue for Review #1
# After synopsis → queue for Review #2
# After script → queue for Review #3
```

---

## Part 3: Critical UX Fixes

### Issue 1: Loader Blocking View Repeatedly

**Problem:**
- `GlobalLoader` shows on every `isFetching > 0` or `isMutating > 0`
- Background refetches trigger loader unnecessarily
- Blocks user interaction

**Root Causes:**
1. `useIsFetching()` catches ALL queries, including background refetches
2. `useIsMutating()` catches ALL mutations
3. No distinction between critical and background operations

**Solution:**

```typescript
// Stories-we-tell/src/components/GlobalLoader.tsx

"use client"

import { useAuth } from '@/lib/auth-context'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function GlobalLoader() {
  const { isLoading: authLoading } = useAuth()
  
  // Only track CRITICAL queries (not background refetches)
  const criticalFetching = useIsFetching({
    predicate: (query) => {
      // Only show loader for queries marked as critical
      return query.queryKey.includes('critical') || 
             query.queryKey.includes('initial') ||
             // Session/project creation
             (query.queryKey.includes('session') && query.state.status === 'loading') ||
             (query.queryKey.includes('project') && query.state.status === 'loading')
    }
  })
  
  // Only track CRITICAL mutations
  const criticalMutating = useIsMutating({
    predicate: (mutation) => {
      // Only show loader for critical mutations
      return mutation.options.mutationKey?.includes('critical') ||
             mutation.options.mutationKey?.includes('create')
    }
  })

  // Route-change aware loading
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastLocationRef = useRef<string | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)

  useEffect(() => {
    const current = `${pathname}?${searchParams?.toString() || ''}`
    if (lastLocationRef.current && lastLocationRef.current !== current) {
      setRouteLoading(true)
      const timeout = setTimeout(() => setRouteLoading(false), 500) // Reduced from 800ms
      return () => clearTimeout(timeout)
    }
    lastLocationRef.current = current
  }, [pathname, searchParams])

  // Only show loader for critical operations
  const show = authLoading || criticalFetching > 0 || criticalMutating > 0 || routeLoading
  
  if (!show) return null

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-white/80 dark:bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #34d399 100%)' }}>
          <span className="text-2xl text-white font-bold">SW</span>
        </div>
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    </div>
  )
}
```

**Update Query Keys:**
```typescript
// Mark critical queries
useQuery({
  queryKey: ['critical', 'projects'], // Add 'critical' prefix
  // ...
})

// Background queries (no loader)
useQuery({
  queryKey: ['dossier', projectId], // No 'critical' = no loader
  refetchInterval: 30000, // Background refresh
  // ...
})
```

**Update ChatPage Loader:**
```typescript
// Stories-we-tell/src/app/chat/page.tsx

// Only show loader for initial auth/project load, not background refetches
{(authLoading || (isAuthenticated && isProjectsLoading && !projectsData)) && (
  // Loader only on initial load
)}
```

---

### Issue 2: Dossier Not Updating Without Refresh

**Problem:**
- Dossier updates in backend but UI doesn't reflect changes
- Need manual page refresh to see updates
- State synchronization issues

**Root Causes:**
1. Dossier query not invalidated after updates
2. No real-time updates from backend
3. Query cache not refreshing

**Solution:**

#### A. Proper Query Invalidation

```typescript
// Stories-we-tell/src/lib/dossier-context.tsx

// Add invalidation after dossier updates
export function useDossierRefresh() {
  const queryClient = useQueryClient()
  
  const refreshDossier = useCallback((projectId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: ['dossier', projectId],
      exact: false // Invalidate all dossier queries for this project
    })
  }, [queryClient])
  
  return { refreshDossier }
}
```

#### B. Event-Based Updates

```typescript
// Listen for dossier_updated events from backend
useEffect(() => {
  const handleDossierUpdated = (event: CustomEvent) => {
    const { project_id } = event.detail
    if (project_id === currentProjectId) {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: ['dossier', project_id] 
      })
      queryClient.refetchQueries({ 
        queryKey: ['dossier', project_id] 
      })
    }
  }
  
  window.addEventListener('dossierUpdated', handleDossierUpdated as EventListener)
  return () => {
    window.removeEventListener('dossierUpdated', handleDossierUpdated as EventListener)
  }
}, [currentProjectId, queryClient])
```

#### C. Optimistic Updates

```typescript
// Update cache optimistically when dossier changes
const updateDossierMutation = useMutation({
  mutationFn: async (update: DossierUpdate) => {
    return await dossierApi.updateDossier(projectId, update)
  },
  onMutate: async (update) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['dossier', projectId] })
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['dossier', projectId])
    
    // Optimistically update
    queryClient.setQueryData(['dossier', projectId], (old: any) => ({
      ...old,
      ...update
    }))
    
    return { previous }
  },
  onError: (err, update, context) => {
    // Rollback on error
    queryClient.setQueryData(['dossier', projectId], context?.previous)
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['dossier', projectId] })
  }
})
```

#### D. Backend Event Emission

```python
# stories-we-tell-backend/app/api/simple_chat.py

# After dossier update, emit event
await send_event({
    "type": "dossier_updated",
    "project_id": str(project_id),
    "dossier": new_metadata,
    "timestamp": datetime.now().isoformat()
})
```

---

### Issue 3: Completed Stories Still Allow New Chat

**Problem:**
- Story completion detected but user can still send messages
- Input box not disabled after completion
- No visual indication that story is complete

**Solution:**

#### A. Backend: Add Completion Status to Session

```python
# Add completion status to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS story_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

# Update on completion
UPDATE sessions 
SET story_completed = TRUE, completed_at = NOW()
WHERE session_id = ? AND project_id = ?;
```

#### B. Frontend: Check Completion Status

```typescript
// Stories-we-tell/src/components/ChatPanel.tsx

// Add completion check from session
const { data: sessionData } = useQuery({
  queryKey: ['session', hookSessionId],
  queryFn: async () => {
    if (!hookSessionId) return null
    return await sessionApi.getSession(hookSessionId)
  },
  enabled: !!hookSessionId
})

const isStoryCompleted = sessionData?.story_completed || storyCompleted

// Disable composer when completed
<Composer
  onSend={handleSendMessage}
  disabled={isStoryCompleted || isLoading}
  sessionId={hookSessionId}
  projectId={hookProjectId}
  // ...
/>

// Show completion message
{isStoryCompleted && (
  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
    <p className="text-sm text-blue-800 dark:text-blue-200">
      ✅ Your story is complete! To start a new story, create a new project.
    </p>
  </div>
)}
```

#### C. Backend: Reject Messages After Completion

```python
# stories-we-tell-backend/app/api/simple_chat.py

@router.post("/chat")
async def chat(...):
    # Check if story is already completed
    session_result = supabase.table("sessions").select("story_completed").eq("session_id", str(session_id)).single().execute()
    
    if session_result.data and session_result.data.get("story_completed"):
        raise HTTPException(
            status_code=400,
            detail="Story is already completed. Please create a new project to start a new story."
        )
    
    # ... rest of chat logic
```

#### D. Update Completion Detection

```python
# After detecting completion, mark session
if is_complete:
    # Mark session as completed
    supabase.table("sessions").update({
        "story_completed": True,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }).eq("session_id", str(session_id)).execute()
    
    # Emit event
    await send_event({
        "type": "story_completed",
        "session_id": str(session_id),
        "project_id": str(project_id)
    })
```

---

## Part 4: State Management Improvements

### Current Issues

1. **Multiple State Sources:**
   - Local state (`useState`)
   - React Query cache
   - Zustand store
   - URL params
   - localStorage

2. **Synchronization Problems:**
   - State gets out of sync
   - Updates don't propagate
   - Race conditions

### Proposed Solution: Centralized State Management

#### 1. Single Source of Truth

```typescript
// Stories-we-tell/src/lib/project-state.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectState {
  currentProjectId: string | null
  currentSessionId: string | null
  storyCompleted: boolean
  workflowStage: string
  
  setCurrentProject: (projectId: string | null) => void
  setCurrentSession: (sessionId: string | null) => void
  setStoryCompleted: (completed: boolean) => void
  setWorkflowStage: (stage: string) => void
  reset: () => void
}

export const useProjectState = create<ProjectState>()(
  persist(
    (set) => ({
      currentProjectId: null,
      currentSessionId: null,
      storyCompleted: false,
      workflowStage: 'intake',
      
      setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
      setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
      setStoryCompleted: (completed) => set({ storyCompleted: completed }),
      setWorkflowStage: (stage) => set({ workflowStage: stage }),
      reset: () => set({
        currentProjectId: null,
        currentSessionId: null,
        storyCompleted: false,
        workflowStage: 'intake'
      })
    }),
    {
      name: 'project-state',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        currentSessionId: state.currentSessionId
      })
    }
  )
)
```

#### 2. React Query Integration

```typescript
// Sync Zustand with React Query
useEffect(() => {
  if (sessionData) {
    useProjectState.getState().setStoryCompleted(sessionData.story_completed)
    useProjectState.getState().setWorkflowStage(sessionData.workflow_stage)
  }
}, [sessionData])
```

#### 3. Event-Driven Updates

```typescript
// Listen for all state-changing events
useEffect(() => {
  const handlers = {
    storyCompleted: (e: CustomEvent) => {
      useProjectState.getState().setStoryCompleted(true)
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
    dossierUpdated: (e: CustomEvent) => {
      queryClient.invalidateQueries({ queryKey: ['dossier'] })
    },
    sessionUpdated: (e: CustomEvent) => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    }
  }
  
  Object.entries(handlers).forEach(([event, handler]) => {
    window.addEventListener(event, handler as EventListener)
  })
  
  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      window.removeEventListener(event, handler as EventListener)
    })
  }
}, [queryClient])
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Fix loader blocking (only show for critical operations)
2. ✅ Fix dossier update synchronization
3. ✅ Fix story completion restriction
4. ✅ Add completion status to sessions

### Phase 2: Dossier Enhancement (Week 2)
1. ✅ Enhanced character structure (age, physical, personality)
2. ✅ Second hero support
3. ✅ Supporting characters
4. ✅ Story metadata (type, season, audience, perspective)

### Phase 3: Human-in-the-Loop (Week 3-4)
1. ✅ Multi-stage validation queue
2. ✅ Review #1: Intake review
3. ✅ Review #2: Synopsis review
4. ✅ Review #3: Script review (enhanced)
5. ✅ Workflow state machine

### Phase 4: State Management (Week 4)
1. ✅ Centralized state management
2. ✅ Event-driven updates
3. ✅ Query synchronization

---

## Database Migrations

```sql
-- 1. Add completion status to sessions
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS story_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'intake';

CREATE INDEX IF NOT EXISTS idx_sessions_completed 
ON sessions(story_completed, completed_at);

-- 2. Enhance validation_queue
ALTER TABLE validation_queue 
ADD COLUMN IF NOT EXISTS validation_stage VARCHAR(50) DEFAULT 'script_review',
ADD COLUMN IF NOT EXISTS synopsis TEXT,
ADD COLUMN IF NOT EXISTS synopsis_feedback TEXT,
ADD COLUMN IF NOT EXISTS intake_data JSONB,
ADD COLUMN IF NOT EXISTS intake_feedback TEXT,
ADD COLUMN IF NOT EXISTS script_package JSONB,
ADD COLUMN IF NOT EXISTS script_package_feedback TEXT;

CREATE INDEX IF NOT EXISTS idx_validation_queue_stage 
ON validation_queue(validation_stage, status);

-- 3. Add dossier workflow indexes
CREATE INDEX IF NOT EXISTS idx_dossier_workflow_stage 
ON public.dossier USING btree ((snapshot_json->>'workflow_stage'));

CREATE INDEX IF NOT EXISTS idx_dossier_validation_status 
ON public.dossier USING btree ((snapshot_json->>'validation_status'));
```

---

## Testing Checklist

### Loader Fixes
- [ ] Loader only shows on critical operations
- [ ] Background refetches don't trigger loader
- [ ] Session/project creation shows loader
- [ ] Route changes show brief loader

### Dossier Synchronization
- [ ] Dossier updates reflect immediately
- [ ] No manual refresh needed
- [ ] Multiple tabs stay in sync
- [ ] Optimistic updates work correctly

### Story Completion
- [ ] Input disabled after completion
- [ ] Visual indicator shows completion
- [ ] Backend rejects messages after completion
- [ ] New project required for new story

### Human-in-the-Loop
- [ ] Review #1 queues after intake
- [ ] Review #2 queues after synopsis
- [ ] Review #3 queues after script
- [ ] Feedback incorporated in revisions
- [ ] Workflow state transitions correctly

---

## Conclusion

This plan addresses:
1. ✅ **Dossier Enhancement** - Full character and metadata support
2. ✅ **Human-in-the-Loop** - Proper 3-stage validation workflow
3. ✅ **Critical UX Fixes** - Loader, synchronization, completion restrictions
4. ✅ **State Management** - Centralized, event-driven updates

**Estimated Timeline:** 3-4 weeks  
**Priority:** Critical fixes first, then enhancements

---

**Document Version:** 1.0  
**Last Updated:** December 2025

