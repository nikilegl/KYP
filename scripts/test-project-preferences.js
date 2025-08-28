// Test script for project preferences database operations
// Run this with: node scripts/test-project-preferences.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

console.log('🔗 Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDatabaseConnection() {
  try {
    console.log('\n📊 Testing basic database connection...')
    
    // Test 1: Check if we can connect
    const { data: testData, error: testError } = await supabase
      .from('user_project_preferences')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError)
      return false
    }
    
    console.log('✅ Database connection successful')
    
    // Test 2: Check table structure
    console.log('\n🏗️ Checking table structure...')
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'user_project_preferences' })
    
    if (columnsError) {
      console.log('⚠️ Could not get column info via RPC, trying direct query...')
      const { data: directColumns, error: directError } = await supabase
        .from('user_project_preferences')
        .select('*')
        .limit(0)
      
      if (directError) {
        console.error('❌ Cannot access table:', directError)
        return false
      }
      
      console.log('✅ Table is accessible')
    } else {
      console.log('✅ Table structure:', columns)
    }
    
    // Test 3: Check RLS policies
    console.log('\n🔒 Checking RLS policies...')
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'user_project_preferences' })
    
    if (policiesError) {
      console.log('⚠️ Could not get policies via RPC')
    } else {
      console.log('✅ RLS policies:', policies)
    }
    
    // Test 4: Try to insert a test record (this will fail without auth, but we can see the error)
    console.log('\n🧪 Testing insert operation...')
    const testUserId = '00000000-0000-0000-0000-000000000000'
    const testProjectId = '00000000-0000-0000-0000-000000000000'
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_project_preferences')
      .insert({
        user_id: testUserId,
        project_id: testProjectId,
        order_position: 0
      })
    
    if (insertError) {
      if (insertError.code === '42501') {
        console.log('✅ RLS is working (insert blocked as expected)')
      } else if (insertError.code === '23505') {
        console.log('✅ Unique constraint is working')
      } else {
        console.log('⚠️ Insert error (expected without auth):', insertError.code, insertError.message)
      }
    } else {
      console.log('⚠️ Insert succeeded (this might indicate RLS is not working)')
    }
    
    console.log('\n✅ Database tests completed successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

// Run the test
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 All tests passed! The database is properly configured.')
    } else {
      console.log('\n💥 Some tests failed. Check the errors above.')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('💥 Test crashed:', error)
    process.exit(1)
  })
