const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');

// Helper to get parent_id from request header
function getParentId(req) {
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
  const { data: owned, error: ownErr } = await supabase
    .from('children')
    .select('id')
    .eq('id', child_id)
    .eq('parent_id', parent_id)
    .single();

  if (ownErr || !owned) return res.status(404).json({ error: 'Child not found' });

  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', child_id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Child deleted successfully.' });
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