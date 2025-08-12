const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');

// Helper to get parent_id from authenticated user or request header (for backward compatibility)
function getParentId(req) {
  // First try to get from authenticated user (preferred method)
  if (req.user && req.user.id) {
    return req.user.id;
  }
  // Fallback to header for backward compatibility
  return req.header('x-parent-id');
}

exports.listChildren = async (req, res) => {
  const parent_id = getParentId(req);
  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });

  const { data, error } = await supabase
    .from('children')
    .select('id, name, grade, birthdate, child_username, access_pin_hash, created_at, updated_at')
    .eq('parent_id', parent_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });

  // Don't expose the pin hash in the response
  const sanitizedData = data.map(child => ({
    ...child,
    access_pin_hash: !!child.access_pin_hash // Convert to boolean for frontend
  }));

  res.json(sanitizedData);
};

exports.createChild = async (req, res) => {
  const parent_id = req.header('x-parent-id');
  const { name, grade, birthdate } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Child name is required' });

  // Note: Child limit is already enforced by middleware
  // req.permissions and req.childrenCount are available from middleware

  try {
    // Create child
    const { data, error } = await supabase
        .from('children')
        .insert([{
          parent_id,
          name: name.trim(),
          grade: grade ? grade.trim() : null,
          birthdate: birthdate || null
        }])
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });

    // Sanitize response
    const sanitizedChild = {
      ...data,
      access_pin_hash: !!data.access_pin_hash
    };

    res.status(201).json({
      ...sanitizedChild,
      // Include helpful subscription info
      planInfo: {
        currentChildren: req.childrenCount + 1, // +1 for the new child
        maxChildren: req.permissions.maxChildren,
        remainingSlots: req.permissions.maxChildren - (req.childrenCount + 1)
      }
    });

  } catch (error) {
    console.error('Error creating child:', error);
    res.status(500).json({ error: 'Failed to create child' });
  }
};

exports.updateChild = async (req, res) => {
  const parent_id = getParentId(req);
  const child_id = req.params.id;
  const { name, grade, birthdate } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_id) return res.status(400).json({ error: 'Missing child_id' });

  // Verify ownership
  const { data: owned, error: ownErr } = await supabase
    .from('children')
    .select('id')
    .eq('id', child_id)
    .eq('parent_id', parent_id)
    .single();

  if (ownErr || !owned) return res.status(404).json({ error: 'Child not found' });

  // Prepare update data
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (grade !== undefined) updateData.grade = grade ? grade.trim() : null;
  if (birthdate !== undefined) updateData.birthdate = birthdate || null;

  const { data, error } = await supabase
    .from('children')
    .update(updateData)
    .eq('id', child_id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Sanitize response
  const sanitizedChild = {
    ...data,
    access_pin_hash: !!data.access_pin_hash
  };

  res.json(sanitizedChild);
};

exports.deleteChild = async (req, res) => {
  const parent_id = getParentId(req);
  const child_id = req.params.id;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });

  // Verify ownership
  const { data: child, error: ownErr } = await supabase
    .from('children')
    .select('id, name')
    .eq('id', child_id)
    .eq('parent_id', parent_id)
    .single();

  if (ownErr || !child) return res.status(404).json({ error: 'Child not found' });

  try {
    // Get child subjects for this child to find related data
    const { data: childSubjects } = await supabase
      .from('child_subjects')
      .select('id')
      .eq('child_id', child_id);

    if (childSubjects && childSubjects.length > 0) {
      const childSubjectIds = childSubjects.map(cs => cs.id);

      // Get units for these child subjects
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .in('child_subject_id', childSubjectIds);

      if (units && units.length > 0) {
        const unitIds = units.map(u => u.id);

        // Get lessons for these units
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .in('unit_id', unitIds);

        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);

          // Delete materials first (they reference lessons)
          const { error: materialsError } = await supabase
            .from('materials')
            .delete()
            .in('lesson_id', lessonIds);

          if (materialsError) {
            return res.status(400).json({ error: `Failed to delete materials: ${materialsError.message}` });
          }
        }

        // Delete lessons (they reference units)
        const { error: lessonsError } = await supabase
          .from('lessons')
          .delete()
          .in('unit_id', unitIds);

        if (lessonsError) {
          return res.status(400).json({ error: `Failed to delete lessons: ${lessonsError.message}` });
        }

        // Delete units (they reference child subjects)
        const { error: unitsError } = await supabase
          .from('units')
          .delete()
          .in('child_subject_id', childSubjectIds);

        if (unitsError) {
          return res.status(400).json({ error: `Failed to delete units: ${unitsError.message}` });
        }
      }

      // Delete any remaining general materials (not in lesson containers)
      const { error: generalMaterialsError } = await supabase
        .from('materials')
        .delete()
        .in('child_subject_id', childSubjectIds);

      if (generalMaterialsError) {
        return res.status(400).json({ error: `Failed to delete general materials: ${generalMaterialsError.message}` });
      }

      // Delete child subjects
      const { error: childSubjectsError } = await supabase
        .from('child_subjects')
        .delete()
        .eq('child_id', child_id);

      if (childSubjectsError) {
        return res.status(400).json({ error: `Failed to delete child subjects: ${childSubjectsError.message}` });
      }
    }

    // Delete schedule entries for this child
    const { error: scheduleError } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('child_id', child_id);

    if (scheduleError) {
      return res.status(400).json({ error: `Failed to delete schedule entries: ${scheduleError.message}` });
    }

    // Finally, delete the child
    const { error: childError } = await supabase
      .from('children')
      .delete()
      .eq('id', child_id);

    if (childError) {
      return res.status(400).json({ error: `Failed to delete child: ${childError.message}` });
    }

    res.json({
      message: `Child "${child.name}" and all associated data deleted successfully.`,
      deleted_child: child
    });

  } catch (error) {
    console.error('Error during child deletion:', error);
    res.status(500).json({ error: 'An unexpected error occurred during deletion.' });
  }
};

// Set/Update Child Username
exports.setChildUsername = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id } = req.params;
  const { username } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_id) return res.status(400).json({ error: 'Child ID is required.' });
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }

  const trimmedUsername = username.trim().toLowerCase(); // Store lowercase for consistency

  try {
      // Verify parent owns the child
      const { data: childData, error: childFetchError } = await supabase
          .from('children')
          .select('id, parent_id')
          .eq('id', child_id)
          .eq('parent_id', parent_id)
          .single();

      if (childFetchError || !childData) {
          return res.status(404).json({ error: 'Child not found or access denied.' });
      }

      // Check if username is already taken (globally unique)
      const { data: existingUser, error: usernameCheckError } = await supabase
          .from('children')
          .select('id')
          .eq('child_username', trimmedUsername)
          .neq('id', child_id) // Exclude current child
          .maybeSingle();

      if (usernameCheckError) throw usernameCheckError;
      if (existingUser) {
          return res.status(409).json({ error: 'Username already taken.' });
      }

      // Update username
      const { data: updatedChild, error: updateError } = await supabase
          .from('children')
          .update({ child_username: trimmedUsername })
          .eq('id', child_id)
          .eq('parent_id', parent_id)
          .select('id, name, child_username')
          .single();

      if (updateError) throw updateError;

      res.json({
        message: 'Username updated successfully.',
        child: updatedChild
      });

  } catch (error) {
      console.error("Error setting child username:", error);
      res.status(500).json({ error: error.message || "Failed to set username." });
  }
};

// Set/Update Child PIN
exports.setChildPin = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id } = req.params;
  const { pin } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_id) return res.status(400).json({ error: 'Child ID is required.' });
  if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });
  }

  try {
      // Verify parent owns the child
      const { data: childData, error: childFetchError } = await supabase
          .from('children')
          .select('id, parent_id')
          .eq('id', child_id)
          .eq('parent_id', parent_id)
          .single();

      if (childFetchError || !childData) {
          return res.status(404).json({ error: 'Child not found or access denied.' });
      }

      // Hash the PIN
      const saltRounds = 10;
      const access_pin_hash = await bcrypt.hash(pin, saltRounds);

      // Update PIN hash
      const { data: updatedChild, error: updateError } = await supabase
          .from('children')
          .update({ access_pin_hash })
          .eq('id', child_id)
          .eq('parent_id', parent_id)
          .select('id, name')
          .single();

      if (updateError) throw updateError;
      res.json({ message: 'PIN updated successfully.' });

  } catch (error) {
      console.error("Error setting child PIN:", error);
      res.status(500).json({ error: error.message || "Failed to set PIN." });
  }
};

// Get parent subscription status for authenticated child
exports.getParentSubscription = async (req, res) => {
  try {
    const { child_id } = req.params;
    const authenticatedChildId = req.child?.child_id;

    // Ensure the authenticated child matches the requested child_id
    // Convert both to strings for comparison since JWT might store as string
    if (String(authenticatedChildId) !== String(child_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the child's parent_id
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('parent_id')
      .eq('id', child_id)
      .single();

    if (childError || !childData) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get parent's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('parent_subscriptions')
      .select('*')
      .eq('parent_id', childData.parent_id)
      .eq('status', 'active')
      .maybeSingle();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return res.status(500).json({ error: 'Failed to fetch subscription status' });
    }

    res.json({
      has_subscription: !!subscription,
      subscription: subscription || null
    });
  } catch (error) {
    console.error('Error in getParentSubscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
