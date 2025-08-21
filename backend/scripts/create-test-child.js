require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const supabase = require('../src/utils/supabaseClient');
const bcrypt = require('bcrypt');

async function createTestChild() {
  try {
    console.log('Creating test child...');
    
    // First check if child already exists
    const { data: existingChild } = await supabase
      .from('children')
      .select('*')
      .eq('child_username', 'testchild')
      .single();
    
    if (existingChild) {
      console.log('Test child already exists!');
      console.log('Username: testchild');
      console.log('PIN: 1234');
      return;
    }
    
    // Check if there are any existing users to use as parent
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    let parentId = null;
    if (users && users.length > 0) {
      parentId = users[0].id;
      console.log('Using existing parent ID:', parentId);
    } else {
      console.log('No existing users found. Creating without parent constraint...');
      // For testing, we'll temporarily bypass the parent constraint
      // by inserting directly with a null parent_id if allowed
    }
    
    // Create a test child with username and PIN
    const hashedPin = await bcrypt.hash('1234', 10);
    
    const { data: child, error } = await supabase
      .from('children')
      .insert([{
        name: 'Test Child',
        child_username: 'testchild',
        access_pin_hash: hashedPin,
        grade: 'Grade 3',
        parent_id: parentId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating test child:', error);
      return;
    }

    console.log('Test child created successfully!');
    console.log('Username: testchild');
    console.log('PIN: 1234');
    console.log('Child data:', child);

  } catch (error) {
    console.error('Script error:', error);
  }
}

createTestChild();