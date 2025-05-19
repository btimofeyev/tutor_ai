const supabase = require('../utils/supabaseClient');

// Helper to get parent_id from request header (placeholder, replace with real auth in production)
function getParentId(req) {
  // In production, you’ll verify Supabase JWT and extract parent_id from the token!
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
  const { name, grade, birthdate } = req.body;
  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });

  // Limit to 5 children per parent
  const { count } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', parent_id);

  if (count >= 5) {
    return res.status(400).json({ error: 'Max 5 children allowed per parent.' });
  }

  const { data, error } = await supabase
    .from('children')
    .insert([{ parent_id, name, grade, birthdate }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
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
