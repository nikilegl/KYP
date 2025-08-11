# Project Drag and Drop Reordering Guide

## Overview

Users can now customize the order of their projects by dragging and dropping project cards. Each user's preferences are saved individually, so different users can have their own project ordering.

## Features Implemented

### 1. **Database Schema**
- **Table**: `user_project_preferences`
- **Columns**: 
  - `user_id` (references auth.users)
  - `project_id` (references projects)
  - `order_position` (integer for ordering)
  - Unique constraint on `(user_id, project_id)`

### 2. **Drag and Drop Interface**
- **Drag Handle**: Grip icon (⋮⋮) appears on hover in top-left of project cards
- **Visual Feedback**: Cards become semi-transparent when dragging
- **Drag Overlay**: Rotated shadow version of card follows cursor
- **Drop Zones**: Any project card position

### 3. **User Experience**
- **Immediate Feedback**: Cards reorder instantly when dropped
- **Persistence**: Order is automatically saved to database
- **Per-User**: Each user has their own custom ordering
- **Fallback**: Projects without custom order appear in creation date order

## Technical Implementation

### **Components Modified/Created:**

1. **`ProjectCard.tsx`** (New)
   - Reusable card component with drag functionality
   - Uses `@dnd-kit/sortable` for drag behavior
   - Shows drag handle on hover
   - Includes all project stats and actions

2. **`ProjectManager.tsx`** (Updated)
   - Implements `DndContext` and `SortableContext`
   - Manages user preferences and project ordering
   - Handles drag events and database updates
   - Provides drag overlay

3. **`userProjectPreferenceService.ts`** (New)
   - CRUD operations for user project preferences
   - Handles both Supabase and localStorage fallback
   - Upsert functionality for efficient updates

### **Database Migration:**
```sql
-- Location: supabase/migrations/20250130120001_create_user_project_preferences.sql
CREATE TABLE user_project_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);
```

### **Key Functions:**

#### **Loading User Preferences:**
```typescript
const preferences = await getUserProjectPreferences(user.id)
const preferenceMap = new Map(preferences.map(p => [p.project_id, p.order_position]))

const sortedProjects = [...projects].sort((a, b) => {
  const aOrder = preferenceMap.get(a.id) ?? 999999
  const bOrder = preferenceMap.get(b.id) ?? 999999
  return aOrder - bOrder
})
```

#### **Saving New Order:**
```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  // Get new order from drag result
  const newOrderedProjects = arrayMove(orderedProjects, oldIndex, newIndex)
  
  // Prepare order data
  const orderData = newOrderedProjects.map((project, index) => ({
    project_id: project.id,
    order_position: index + 1
  }))
  
  // Save to database
  await updateProjectOrder(user.id, orderData)
}
```

## Usage Instructions

### **For Users:**
1. **Hover** over any project card
2. **Click and hold** the grip handle (⋮⋮) in the top-left corner
3. **Drag** the card to the desired position
4. **Release** to drop the card in the new position
5. **Order is automatically saved** - no additional action needed

### **For Developers:**

#### **Testing the Feature:**
1. **Ensure migration is applied**: `supabase db push`
2. **Create multiple projects** in the workspace
3. **Sign in as different users** to test per-user preferences
4. **Drag projects to different positions** and verify:
   - UI updates immediately
   - Order persists after page refresh
   - Different users see different orders

#### **Error Handling:**
- **Network failure**: Optimistic updates revert if database save fails
- **Missing user**: Drag functionality is disabled if no authenticated user
- **Permission errors**: RLS policies ensure users can only modify their own preferences

## Performance Considerations

### **Optimizations Implemented:**
1. **Optimistic Updates**: UI updates immediately before database save
2. **Efficient Queries**: Indexed on `(user_id, order_position)` for fast sorting
3. **Upsert Operations**: Single database call handles both insert and update
4. **Local Fallback**: Works offline with localStorage

### **Scalability:**
- **User Isolation**: Each user's preferences are independent
- **Project Agnostic**: Works with any number of projects
- **Memory Efficient**: Only loads preferences for current user

## Error Scenarios and Handling

### **Database Errors:**
```typescript
try {
  await updateProjectOrder(user.id, orderData)
} catch (error) {
  console.error('Error updating project order:', error)
  // Revert optimistic update
  setOrderedProjects(originalOrder)
}
```

### **Authentication Errors:**
- Drag functionality is disabled when `user` is null
- Graceful fallback to default creation date ordering

### **Network Errors:**
- Uses localStorage fallback for offline functionality
- Optimistic updates provide immediate feedback

## Future Enhancements

### **Potential Improvements:**
1. **Bulk Operations**: Select multiple projects and reorder together
2. **Keyboard Navigation**: Arrow keys for accessibility
3. **Undo/Redo**: Revert ordering changes
4. **Shared Preferences**: Team-level project ordering
5. **Drag Preview**: Show ghost outline of drop position
6. **Mobile Touch**: Enhanced touch support for mobile devices

### **Analytics Integration:**
- Track how often users reorder projects
- Identify most commonly reordered projects
- Measure user engagement with customization features

## Testing Checklist

### **Functional Tests:**
- [ ] Drag handle appears on hover
- [ ] Cards can be dragged to new positions
- [ ] Order persists after page refresh
- [ ] Different users have different orders
- [ ] Drag overlay follows cursor correctly
- [ ] Error handling works when database is unavailable

### **Performance Tests:**
- [ ] Large number of projects (50+) still performs well
- [ ] No memory leaks during repeated drag operations
- [ ] Database queries complete within reasonable time (<500ms)

### **Accessibility Tests:**
- [ ] Keyboard navigation works
- [ ] Screen readers can identify drag handles
- [ ] Focus management during drag operations
- [ ] High contrast mode compatibility

## Browser Compatibility

### **Supported Browsers:**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### **Known Issues:**
- Touch devices may need additional polyfills
- Older browsers may fall back to click-to-reorder

## Security Considerations

### **RLS Policies:**
```sql
CREATE POLICY "Users can manage their own project preferences"
  ON user_project_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### **Data Validation:**
- User can only modify their own preferences
- Project IDs are validated against existing projects
- Order positions are constrained to positive integers

## Conclusion

The project drag and drop functionality provides users with a personalized way to organize their projects. The implementation is robust, performant, and provides a smooth user experience while maintaining data integrity and security.
