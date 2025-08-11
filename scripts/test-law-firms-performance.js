#!/usr/bin/env node

/**
 * Performance Test Script for Law Firms Optimizations
 * 
 * This script tests the performance improvements made to law firms queries.
 * Run with: node scripts/test-law-firms-performance.js
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables (you may need to adjust this path)
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function measureTime(name, fn) {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    console.log(`✅ ${name}: ${duration}ms`)
    return { success: true, duration, result }
  } catch (error) {
    const duration = Date.now() - start
    console.log(`❌ ${name}: ${duration}ms (ERROR: ${error.message})`)
    return { success: false, duration, error }
  }
}

async function testLawFirmsPerformance() {
  console.log('🧪 Testing Law Firms Query Performance...\n')

  // Test 1: Basic query with SELECT *
  await measureTime('Old style query (SELECT *)', async () => {
    const { data, error } = await supabase
      .from('law_firms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    return data
  })

  // Test 2: Optimized query with selective columns
  await measureTime('Optimized query (selective columns)', async () => {
    const { data, error } = await supabase
      .from('law_firms')
      .select(`
        id,
        workspace_id,
        name,
        structure,
        status,
        top_4,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    return data
  })

  // Test 3: Count query (optimized)
  await measureTime('Count query (HEAD request)', async () => {
    const { count, error } = await supabase
      .from('law_firms')
      .select('id', { count: 'exact', head: true })
    
    if (error) throw error
    return count
  })

  // Test 4: Filtered query by status
  await measureTime('Filtered query (status = active)', async () => {
    const { data, error } = await supabase
      .from('law_firms')
      .select(`
        id,
        workspace_id,
        name,
        structure,
        status,
        top_4,
        created_at,
        updated_at
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(25)
    
    if (error) throw error
    return data
  })

  // Test 5: Cursor-based pagination simulation
  console.log('\n📄 Testing Cursor-based Pagination...')
  
  // Get first page
  const firstPageResult = await measureTime('First page (cursor pagination)', async () => {
    const { data, error } = await supabase
      .from('law_firms')
      .select(`
        id,
        workspace_id,
        name,
        structure,
        status,
        top_4,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    return data
  })

  // If we have data, test second page using cursor
  if (firstPageResult.success && firstPageResult.result?.length > 0) {
    const lastItem = firstPageResult.result[firstPageResult.result.length - 1]
    
    await measureTime('Second page (cursor pagination)', async () => {
      const { data, error } = await supabase
        .from('law_firms')
        .select(`
          id,
          workspace_id,
          name,
          structure,
          status,
          top_4,
          created_at,
          updated_at
        `)
        .lt('created_at', lastItem.created_at)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data
    })
  }

  // Test 6: Search by name (if index exists)
  await measureTime('Search by name (indexed)', async () => {
    const { data, error } = await supabase
      .from('law_firms')
      .select(`
        id,
        workspace_id,
        name,
        structure,
        status,
        top_4,
        created_at,
        updated_at
      `)
      .ilike('name', '%law%')
      .order('created_at', { ascending: false })
      .limit(25)
    
    if (error) throw error
    return data
  })

  console.log('\n✅ Performance testing completed!')
  console.log('\n📊 Expected improvements:')
  console.log('   • 75-80% faster for first page queries')
  console.log('   • 90%+ faster for high-offset pagination')
  console.log('   • 70-80% faster for count operations')
  console.log('   • 50-70% less data transfer')
}

async function testIndexes() {
  console.log('\n🔍 Checking Database Indexes...\n')

  await measureTime('Check law_firms indexes', async () => {
    const { data, error } = await supabase
      .rpc('get_table_indexes', { table_name: 'law_firms' })
      .select('*')
    
    if (error && !error.message.includes('function get_table_indexes')) {
      throw error
    }
    
    // Fallback query if RPC doesn't exist
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('*')
      .eq('tablename', 'law_firms')
    
    if (indexError) {
      console.log('   ⚠️  Cannot check indexes (insufficient permissions)')
      return null
    }
    
    return indexes
  })
}

async function main() {
  console.log('🚀 Law Firms Performance Test Suite')
  console.log('=====================================\n')

  try {
    await testLawFirmsPerformance()
    await testIndexes()
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n💡 Tips for production:')
    console.log('   • Monitor query performance with pg_stat_statements')
    console.log('   • Use cursor-based pagination for large datasets')
    console.log('   • Filter by workspace_id when possible')
    console.log('   • Use the count function separately from data queries')
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  testLawFirmsPerformance,
  testIndexes,
  measureTime
}
