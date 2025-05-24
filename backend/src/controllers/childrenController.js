const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');
// Helper to get parent_id from request header (placeholder, replace with real auth in production)
function getParentId(req) {
  return req.header('x-parent-id');
}

exports.listChildren = async (req, res) => {
  const parent_id = getParentId(req);
  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', parent_id);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};
exports.createChild = async (req, res) => {
  const parent_id = getParentId(req);
  const { name, grade, birthdate } = req.body; // Add other fields if needed
  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });

  // Limit children per parent (existing logic)
  const { count } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parent_id);
  if (count >= 5 && process.env.NODE_ENV !== 'development') { // Example: limit of 5
      return res.status(400).json({ error: 'Max children limit reached.' });
  }
  // When creating a child, username and PIN are not set initially
  const { data, error } = await supabase
      .from('children')
      .insert([{ parent_id, name, grade, birthdate }])
      .select()
      .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};
exports.setChildUsername = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id } = req.params;
  const { username } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_id) return res.status(400).json({ error: 'Child ID is required.' });
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }

  const trimmedUsername = username.trim();

  try {
      // 1. Verify parent owns the child
      const { data: childData, error: childFetchError } = await supabase
          .from('children')
          .select('id, parent_id')
          .eq('id', child_id)
          .eq('parent_id', parent_id) // Ensures parent owns this child
          .single();

      if (childFetchError || !childData) {
          return res.status(404).json({ error: 'Child not found or access denied.' });
      }

      // 2. Check if username is already taken (globally for this example)
      //    To make it unique per parent, query would be: .eq('parent_id', parent_id).eq('child_username', trimmedUsername)
      const { data: existingUser, error: usernameCheckError } = await supabase
          .from('children')
          .select('id')
          .eq('child_username', trimmedUsername)
          .neq('id', child_id) // Exclude the current child if they already have this username
          .maybeSingle(); // Use maybeSingle to handle 0 or 1 result without error

      if (usernameCheckError) throw usernameCheckError;
      if (existingUser) {
          return res.status(409).json({ error: 'Username already taken.' });
      }

      // 3. Update username
      const { data: updatedChild, error: updateError } = await supabase
          .from('children')
          .update({ child_username: trimmedUsername })
          .eq('id', child_id)
          .eq('parent_id', parent_id) // Double check ownership on update
          .select('id, name, child_username')
          .single();

      if (updateError) throw updateError;
      res.json({ message: 'Username updated successfully.', child: updatedChild });

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
  if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) { // Example: 4 to 6 digit PIN
      return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });
  }

  try {
      // 1. Verify parent owns the child
      const { data: childData, error: childFetchError } = await supabase
          .from('children')
          .select('id, parent_id')
          .eq('id', child_id)
          .eq('parent_id', parent_id)
          .single();

      if (childFetchError || !childData) {
          return res.status(404).json({ error: 'Child not found or access denied.' });
      }

      // 2. Hash the PIN
      const saltRounds = 10;
      const access_pin_hash = await bcrypt.hash(pin, saltRounds);

      // 3. Update PIN hash
      const { data: updatedChild, error: updateError } = await supabase
          .from('children')
          .update({ access_pin_hash })
          .eq('id', child_id)
          .eq('parent_id', parent_id)
          .select('id, name') // Don't return the hash
          .single();
      
      if (updateError) throw updateError;
      res.json({ message: 'PIN updated successfully.' });

  } catch (error) {
      console.error("Error setting child PIN:", error);
      res.status(500).json({ error: error.message || "Failed to set PIN." });
  }
};
exports.updateChild = async (req, res) => {
  const parent_id = getParentId(req);
  const child_id = req.params.id;
  const { name, grade, birthdate } = req.body;
  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });

  // Only allow updating if this child belongs to parent
  const { data: owned, error: ownErr } = await supabase
    .from('children')
    .select('*')
    .eq('id', child_id)
    .eq('parent_id', parent_id)
    .single();

  if (ownErr || !owned) return res.status(404).json({ error: 'Child not found' });

  const { data, error } = await supabase
    .from('children')
    .update({ name, grade, birthdate })
    .eq('id', child_id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
};

exports.deleteChild = async (req, res) => {
  const parent_id = getParentId(req);
  const child_id = req.params.id;
  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });

  // Only allow delete if this child belongs to parent
  const { data: owned, error: ownErr } = await supabase
    .from('children')
    .select('*')
    .eq('id', child_id)
    .eq('parent_id', parent_id)
    .single();

  if (ownErr || !owned) return res.status(404).json({ error: 'Child not found' });

  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', child_id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Child deleted.' });
};
